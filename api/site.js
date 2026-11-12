/* ==========================================================================
   Daya admin API: one serverless function on Vercel.

   Public (the website reads this):
     GET  /api/site?a=content

   Private (needs the admin password, then a signed cookie):
     POST /api/site?a=login        { password }
     POST /api/site?a=logout
     GET  /api/site?a=me
     GET  /api/site?a=adminload
     POST /api/site?a=save         { content }
     POST /api/site?a=upload       { name, type, data (base64) }
     POST /api/site?a=media        (lists photos already in storage)

   Vercel environment variables it needs:
     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD, ADMIN_SESSION_SECRET
   ========================================================================== */
"use strict";

const crypto = require("crypto");

const TABLE = "site_content";
const BUCKET = "site-images";
const COOKIE = "daya_admin";
const SESSION_SECONDS = 60 * 60 * 12; // 12 hours
const MAX_JSON_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_BYTES = 3.1 * 1024 * 1024; // keeps the base64 upload under Vercel's 4.5 MB request limit
const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif"
};

/* ---------- configuration ---------- */
const rowId = () => process.env.SITE_CONTENT_ID || "daya-site";
function storage() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return url && key ? { url, key } : null;
}
const secret = () => process.env.ADMIN_SESSION_SECRET || "";
const authConfigured = () => Boolean(process.env.ADMIN_PASSWORD && secret().length >= 16);
const sbHeaders = (key) => ({ apikey: key, Authorization: "Bearer " + key });

/* ---------- signing, passwords, sessions ---------- */
const sign = (payload) => crypto.createHmac("sha256", secret()).update(payload).digest("hex");

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function checkPassword(input) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  // compare HMACs so the lengths of the passwords never leak
  return safeEqual(sign("pw:" + input), sign("pw:" + expected));
}

function makeToken() {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return exp + "." + sign(exp);
}

function verifyToken(token) {
  if (!token || !authConfigured()) return false;
  const [exp, sig] = String(token).split(".");
  if (!exp || !sig) return false;
  if (!safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Math.floor(Date.now() / 1000);
}

function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return "";
}

function cookieHeader(value, maxAge) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}

/* ---------- small helpers ---------- */
function send(res, status, body, headers) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const k in headers || {}) res.setHeader(k, headers[k]);
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8") || "{}");
    if (typeof req.body === "string") return JSON.parse(req.body || "{}");
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_JSON_BYTES) throw new Error("That request is too large.");
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

const timeout = () => AbortSignal.timeout(9000);

/* ---------- login throttle (per server instance) ---------- */
const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

/* ---------- storage ---------- */
async function loadRow() {
  const c = storage();
  if (!c) return { configured: false, data: null };
  const r = await fetch(
    `${c.url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(rowId())}&select=data`,
    { headers: sbHeaders(c.key), signal: timeout() }
  );
  if (!r.ok) {
    const hint = r.status === 404 ? " The site_content table is missing. Run the setup SQL." : "";
    throw new Error(`Could not read saved content (${r.status}).${hint}`);
  }
  const rows = await r.json();
  return { configured: true, data: rows[0] ? rows[0].data : null };
}

async function saveRow(data) {
  const c = storage();
  if (!c) throw new Error("Storage is not set up. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.");
  const r = await fetch(`${c.url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: {
      ...sbHeaders(c.key),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify({ id: rowId(), data, updated_at: new Date().toISOString() }),
    signal: timeout()
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Could not save (${r.status}). ${text.slice(0, 160)}`);
  }
}

/* ---------- cleaning what the admin sends ---------- */
const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
const slug = (v) => str(v, 80).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
const link = (v) => {
  const s = str(v, 2000).trim();
  return /^(https?:\/\/|\/)/i.test(s) ? s : "";
};
function money(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n < 1e10 ? Math.round(n * 100) / 100 : null;
}
const today = () => new Date().toISOString().slice(0, 10);

function uniqueSlugs(list, label) {
  const seen = new Set();
  for (const x of list) {
    const key = x.slug || x.id;
    if (seen.has(key)) throw new Error(`Two ${label} have the same name. Give each one its own name.`);
    seen.add(key);
  }
}

function cleanContent(input) {
  if (!input || typeof input !== "object") throw new Error("Nothing to save.");
  const out = {};

  const c = input.config || {};
  const email = str(c.email, 120).trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new Error("That email address doesn't look right.");
  out.config = {
    affirmationStart: /^\d{4}-\d{2}-\d{2}$/.test(c.affirmationStart || "") ? c.affirmationStart : "2026-11-09",
    affirmationOverride: str(c.affirmationOverride, 300).trim(),
    affirmations: (Array.isArray(c.affirmations) ? c.affirmations : [])
      .map((s) => str(s, 300).trim()).filter(Boolean).slice(0, 200),
    usdToNgn: money(c.usdToNgn) > 0 ? money(c.usdToNgn) : 1500,
    imageResize: !!c.imageResize,
    whatsapp: str(c.whatsapp, 30).replace(/\D/g, ""),
    email
  };

  out.text = {};
  const t = input.text && typeof input.text === "object" ? input.text : {};
  Object.keys(t).slice(0, 100).forEach((k) => {
    if (!/^[A-Za-z0-9]{1,40}$/.test(k)) return;
    out.text[k] = /Image$/.test(k) ? link(t[k]) : str(t[k], 600);
  });

  const cleanList = (arr, label, build) => {
    if (!Array.isArray(arr) || !arr.length) throw new Error(`Keep at least one ${label}.`);
    const list = arr.slice(0, 100).map(build).filter((x) => x.name);
    if (!list.length) throw new Error(`Keep at least one ${label}.`);
    uniqueSlugs(list, label + "s");
    return list;
  };
  out.bodyTypes = cleanList(input.bodyTypes, "body type", (b) => ({
    slug: slug(b.slug) || slug(b.name), name: str(b.name, 60).trim(), desc: str(b.desc, 300).trim()
  }));
  out.occasions = cleanList(input.occasions, "occasion", (o) => ({
    slug: slug(o.slug) || slug(o.name), name: str(o.name, 60).trim()
  }));

  const ids = new Set();
  out.looks = (Array.isArray(input.looks) ? input.looks : []).slice(0, 300).map((l, i) => {
    const name = str(l.name, 120).trim();
    if (!name) throw new Error(`Look number ${i + 1} needs a name.`);
    let id = slug(l.id) || slug(name) || "look-" + (i + 1);
    while (ids.has(id)) id += "-" + Math.random().toString(36).slice(2, 5);
    ids.add(id);
    const price = money(l.price) || 0;
    const was = money(l.was);
    const look = {
      id, name,
      brand: str(l.brand, 80).trim(),
      occasion: slug(l.occasion),
      bodies: (Array.isArray(l.bodies) ? l.bodies : []).map(slug).filter(Boolean).slice(0, 30),
      price,
      currency: l.currency === "USD" ? "USD" : "NGN",
      featured: !!l.featured,
      visible: l.visible !== false,
      url: link(l.url),
      fabric: str(l.fabric, 120).trim(),
      styling: str(l.styling, 400).trim(),
      image: link(l.image)
    };
    if (was && was > price) look.was = was;
    return look;
  });

  const aids = new Set();
  out.articles = (Array.isArray(input.articles) ? input.articles : []).slice(0, 200).map((a, i) => {
    const title = str(a.title, 160).trim();
    if (!title) throw new Error(`Article number ${i + 1} needs a title.`);
    let id = slug(a.id) || slug(title) || "article-" + (i + 1);
    while (aids.has(id)) id += "-" + Math.random().toString(36).slice(2, 5);
    aids.add(id);
    const mins = parseInt(a.readMins, 10);
    return {
      id, title,
      date: /^\d{4}-\d{2}-\d{2}$/.test(a.date || "") ? a.date : today(),
      readMins: mins >= 1 && mins <= 60 ? mins : 3,
      excerpt: str(a.excerpt, 400).trim(),
      image: link(a.image),
      body: (Array.isArray(a.body) ? a.body : []).map((p) => str(p, 4000).trim()).filter(Boolean).slice(0, 120),
      visible: a.visible !== false
    };
  });

  return out;
}

/* ---------- image checks ---------- */
function looksLikeImage(type, buf) {
  const hex = buf.subarray(0, 12).toString("hex");
  const ascii = buf.subarray(0, 12).toString("latin1");
  if (type === "image/jpeg") return hex.startsWith("ffd8ff");
  if (type === "image/png") return hex.startsWith("89504e47");
  if (type === "image/gif") return ascii.startsWith("GIF8");
  if (type === "image/webp") return ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP";
  if (type === "image/avif") return ascii.slice(4, 8) === "ftyp";
  return false;
}

/* ---------- the handler ---------- */
module.exports = async function handler(req, res) {
  try {
    const u = new URL(req.url, "http://localhost");
    const action = u.searchParams.get("a") || "";
    const method = req.method;

    /* public: what the website reads */
    if (action === "content" && method === "GET") {
      try {
        const row = await loadRow();
        return send(res, 200, { data: row.data }, {
          "Cache-Control": "public, max-age=20, s-maxage=20"
        });
      } catch (e) {
        return send(res, 200, { data: null, error: "unavailable" });
      }
    }

    if (action === "me" && method === "GET") {
      return send(res, 200, {
        signedIn: verifyToken(readCookie(req, COOKIE)),
        authConfigured: authConfigured(),
        storageConfigured: storage() !== null
      });
    }

    if (action === "login" && method === "POST") {
      if (!authConfigured()) {
        return send(res, 500, { error: "Admin is not set up yet. Add ADMIN_PASSWORD and ADMIN_SESSION_SECRET in Vercel." });
      }
      const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
      const now = Date.now();
      const entry = attempts.get(ip);
      if (entry && now - entry.first < WINDOW_MS && entry.count >= MAX_ATTEMPTS) {
        return send(res, 429, { error: "Too many attempts. Try again in a few minutes." });
      }
      let password = "";
      try { password = String((await readBody(req)).password || ""); } catch (e) { /* ignore */ }
      if (!checkPassword(password)) {
        const fresh = entry && now - entry.first < WINDOW_MS ? entry : { count: 0, first: now };
        fresh.count += 1;
        attempts.set(ip, fresh);
        return send(res, 401, { error: "Wrong password." });
      }
      attempts.delete(ip);
      return send(res, 200, { ok: true }, { "Set-Cookie": cookieHeader(makeToken(), SESSION_SECONDS) });
    }

    if (action === "logout" && method === "POST") {
      return send(res, 200, { ok: true }, { "Set-Cookie": cookieHeader("", 0) });
    }

    /* everything below needs a signed-in admin */
    const adminActions = ["adminload", "save", "upload", "media"];
    if (!adminActions.includes(action)) return send(res, 404, { error: "Not found." });
    if (!verifyToken(readCookie(req, COOKIE))) return send(res, 401, { error: "Please sign in." });
    if (method !== "GET" && !/^application\/json/i.test(req.headers["content-type"] || "")) {
      return send(res, 415, { error: "Unsupported request." });
    }

    if (action === "adminload" && method === "GET") {
      const row = await loadRow();
      return send(res, 200, { data: row.data, storageConfigured: row.configured });
    }

    if (action === "save" && method === "POST") {
      let body;
      try { body = await readBody(req); } catch (e) { return send(res, 400, { error: "Invalid data." }); }
      let clean;
      try { clean = cleanContent(body && body.content); } catch (e) { return send(res, 400, { error: e.message }); }
      await saveRow(clean);
      return send(res, 200, { ok: true });
    }

    if (action === "upload" && method === "POST") {
      const c = storage();
      if (!c) return send(res, 500, { error: "Storage is not set up. Add the Supabase variables in Vercel first." });
      let body;
      try { body = await readBody(req); } catch (e) { return send(res, 400, { error: "Invalid upload." }); }
      const type = String((body && body.type) || "").toLowerCase();
      const ext = IMAGE_TYPES[type];
      if (!ext) return send(res, 400, { error: "Please choose a JPG, PNG, WebP, GIF or AVIF image." });
      const buf = Buffer.from(String(body.data || ""), "base64");
      if (!buf.length) return send(res, 400, { error: "No image received." });
      if (buf.length > MAX_IMAGE_BYTES) return send(res, 400, { error: "That image is too large. Try a smaller photo." });
      if (!looksLikeImage(type, buf)) return send(res, 400, { error: "That file doesn't look like a real image." });
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const r = await fetch(`${c.url}/storage/v1/object/${BUCKET}/${path}`, {
        method: "POST",
        headers: { ...sbHeaders(c.key), "Content-Type": type, "x-upsert": "false" },
        body: buf,
        signal: timeout()
      });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        return send(res, 500, { error: `Upload failed (${r.status}). ${text.slice(0, 160)}` });
      }
      return send(res, 200, { url: `${c.url}/storage/v1/object/public/${BUCKET}/${path}` });
    }

    if (action === "media" && method === "POST") {
      const c = storage();
      if (!c) return send(res, 500, { error: "Storage is not set up." });
      const r = await fetch(`${c.url}/storage/v1/object/list/${BUCKET}`, {
        method: "POST",
        headers: { ...sbHeaders(c.key), "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: "", limit: 200, offset: 0, sortBy: { column: "created_at", order: "desc" } }),
        signal: timeout()
      });
      if (!r.ok) return send(res, 500, { error: `Could not load photos (${r.status}).` });
      const items = await r.json();
      const images = (Array.isArray(items) ? items : [])
        .filter((o) => o && o.id && /\.(jpe?g|png|webp|gif|avif)$/i.test(o.name || ""))
        .map((o) => ({ name: o.name, url: `${c.url}/storage/v1/object/public/${BUCKET}/${o.name}` }));
      return send(res, 200, { images });
    }

    return send(res, 405, { error: "Method not allowed." });
  } catch (e) {
    return send(res, 500, { error: (e && e.message) || "Something went wrong." });
  }
};
