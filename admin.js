/* Daya admin. Talks to /api/site. Plain JavaScript, no build step. */
(function () {
  "use strict";

  const DEFAULTS = JSON.parse(JSON.stringify(window.DAYA));
  const API = "/api/site";
  const app = document.getElementById("app");

  const S = { content: null, tab: "text", dirty: false, saving: false, storageOk: true };
  const openItems = new Set();
  let uidN = 0;
  const uid = () => "f" + ++uidN;

  /* ---------- tiny DOM helper ---------- */
  function h(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") n.className = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (k === "value") n.value = v;
      else if (v === true) n.setAttribute(k, "");
      else n.setAttribute(k, v);
    }
    kids.flat(Infinity).forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      n.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
    return n;
  }

  /* ---------- talking to the server ---------- */
  async function api(action, opts) {
    opts = opts || {};
    const init = { method: "GET", credentials: "same-origin", headers: {} };
    if (opts.body !== undefined) {
      init.method = "POST";
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body, (k, v) => (k.charAt(0) === "_" ? undefined : v));
    }
    const r = await fetch(`${API}?a=${action}`, init);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(data.error || "Something went wrong. Please try again.");
      e.status = r.status;
      throw e;
    }
    return data;
  }

  /* ---------- content helpers ---------- */
  function mergeContent(saved) {
    const c = JSON.parse(JSON.stringify(DEFAULTS));
    if (saved && typeof saved === "object") {
      if (saved.config) c.config = Object.assign({}, c.config, saved.config);
      if (saved.text) c.text = Object.assign({}, c.text, saved.text);
      ["bodyTypes", "occasions", "looks", "articles"].forEach((k) => {
        if (!Array.isArray(saved[k])) return;
        if ((k === "bodyTypes" || k === "occasions") && !saved[k].length) return;
        c[k] = saved[k];
      });
    }
    c.looks.forEach((l) => {
      l.bodies = l.bodies || [];
      l.currency = l.currency || "NGN";
      if (l.visible === undefined) l.visible = true;
    });
    c.articles.forEach((a) => {
      a.body = a.body || [];
      if (a.visible === undefined) a.visible = true;
    });
    return c;
  }

  const slugify = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  function uniqueSlug(base, taken) {
    let s = slugify(base) || "item";
    let n = 2;
    const root = s;
    while (taken.includes(s)) s = root + "-" + n++;
    return s;
  }
  function ensureSlugs() {
    ["bodyTypes", "occasions"].forEach((k) => {
      const list = S.content[k];
      list.forEach((x) => {
        if (!x.slug && x.name && x.name.trim()) {
          x.slug = uniqueSlug(x.name, list.map((y) => y.slug).filter(Boolean));
        }
      });
    });
  }
  const today = () => new Date().toISOString().slice(0, 10);
  const money = (n, cur) => (n || n === 0 ? (cur === "USD" ? "$" : "₦") + Number(n).toLocaleString("en-US") : "No price");
  const occName = (slug) => {
    const o = S.content.occasions.find((x) => x.slug === slug);
    return o ? o.name : "No occasion";
  };
  function swap(arr, i, dir) {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  function currentAffirmation(cfg) {
    if (cfg.affirmationOverride && cfg.affirmationOverride.trim()) return cfg.affirmationOverride.trim();
    const list = cfg.affirmations || [];
    if (!list.length) return "";
    const start = new Date(cfg.affirmationStart + "T00:00:00");
    let weeks = Math.floor((Date.now() - start.getTime()) / (7 * 24 * 3600 * 1000));
    if (isNaN(weeks) || weeks < 0) weeks = 0;
    return list[weeks % list.length];
  }

  /* ---------- state: unsaved changes ---------- */
  function touch() {
    S.dirty = true;
    paintSaveBar();
  }
  window.addEventListener("beforeunload", (e) => {
    if (S.dirty) { e.preventDefault(); e.returnValue = ""; }
  });
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s" && S.content) {
      e.preventDefault();
      save();
    }
  });

  /* ---------- form building blocks ---------- */
  function field(label, get, set, o) {
    o = o || {};
    const id = uid();
    const input = o.rows ? h("textarea", { id, rows: o.rows }) : h("input", { id, type: o.type || "text" });
    if (o.placeholder) input.placeholder = o.placeholder;
    if (o.inputmode) input.setAttribute("inputmode", o.inputmode);
    if (o.step) input.setAttribute("step", o.step);
    if (o.min !== undefined) input.setAttribute("min", o.min);
    const v = get();
    input.value = v === undefined || v === null ? "" : v;
    input.addEventListener("input", () => { set(input.value); touch(); if (o.onInput) o.onInput(input); });
    if (o.onBlur) input.addEventListener("blur", () => o.onBlur(input));
    const wrap = h("div", { class: "a-field" }, h("label", { for: id }, label), input, o.hint ? h("p", { class: "a-hint" }, o.hint) : null);
    wrap.control = input;
    return wrap;
  }

  function check(label, get, set, hint) {
    const input = h("input", { type: "checkbox" });
    input.checked = !!get();
    input.addEventListener("change", () => { set(input.checked); touch(); });
    return h("label", { class: "a-check" }, input, h("span", {}, label, hint ? h("small", {}, hint) : null));
  }

  function select(label, options, get, set, hint) {
    const id = uid();
    const sel = h("select", { id });
    options.forEach((o) => sel.append(h("option", { value: o.value }, o.label)));
    sel.value = get();
    if (sel.value !== get()) { sel.append(h("option", { value: get() }, get() || "None")); sel.value = get(); }
    sel.addEventListener("change", () => { set(sel.value); touch(); });
    return h("div", { class: "a-field" }, h("label", { for: id }, label), sel, hint ? h("p", { class: "a-hint" }, hint) : null);
  }

  function card(title, sub, ...kids) {
    return h("section", { class: "a-card" }, title ? h("h2", {}, title) : null, sub ? h("p", { class: "a-sub" }, sub) : null, h("div", { class: "a-stack" }, kids));
  }

  /* ---------- photos ---------- */
  async function shrink(file) {
    const bmp = await createImageBitmap(file);
    const max = 1600;
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * k), hh = Math.round(bmp.height * k);
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = hh;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, hh);
    ctx.drawImage(bmp, 0, 0, w, hh);
    if (bmp.close) bmp.close();
    return new Promise((ok, no) => cv.toBlob((b) => (b ? ok(b) : no(new Error("encode"))), "image/jpeg", 0.86));
  }
  const toBase64 = (blob) => new Promise((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] || "");
    r.onerror = () => no(new Error("Could not read that photo."));
    r.readAsDataURL(blob);
  });

  async function uploadPhoto(file) {
    if (!/^image\//.test(file.type)) throw new Error("Please choose a photo (JPG, PNG, WebP or GIF).");
    let blob = file, type = file.type;
    if (type !== "image/gif") {
      try { blob = await shrink(file); type = "image/jpeg"; }
      catch (e) { if (file.size > 3 * 1024 * 1024) throw new Error("This browser can't shrink that photo. Try a JPG or PNG."); }
    }
    if (blob.size > 3 * 1024 * 1024) throw new Error("That photo is too large (the limit is about 3 MB). Try a smaller one.");
    const res = await api("upload", { body: { name: file.name, type, data: await toBase64(blob) } });
    return res.url;
  }

  async function openLibrary(onPick) {
    const msg = h("p", { class: "a-hint" }, "Loading your photos…");
    const grid = h("div", { class: "a-library" });
    const close = () => { modal.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    const modal = h("div", { class: "a-modal", role: "dialog", "aria-modal": "true", "aria-label": "Your photos", onclick: (e) => { if (e.target === modal) close(); } },
      h("div", { class: "a-dialog" },
        h("header", {}, h("h2", {}, "Your photos"), h("button", { type: "button", class: "a-btn small", onclick: close }, "Close")),
        h("div", { class: "a-body" }, msg, grid)));
    document.body.append(modal);
    document.addEventListener("keydown", onKey);
    try {
      const r = await api("media", { body: {} });
      if (!r.images.length) { msg.textContent = "No photos yet. Upload one first."; return; }
      msg.hidden = true;
      r.images.forEach((im) => grid.append(h("button", { type: "button", "aria-label": "Use this photo", onclick: () => { onPick(im.url); close(); } }, h("img", { src: im.url, alt: "", loading: "lazy" }))));
    } catch (e) { msg.textContent = e.message; }
  }

  function imageField(label, get, set) {
    const thumb = h("img", { class: "a-thumb", alt: "" });
    const input = h("input", { type: "text", "aria-label": label + " link", placeholder: "Paste a photo link, upload one, or choose from your library" });
    const err = h("p", { class: "a-err", hidden: true });
    const file = h("input", { type: "file", accept: "image/*", style: "display:none" });
    const up = h("button", { type: "button", class: "a-btn small" }, "Upload photo");
    const lib = h("button", { type: "button", class: "a-btn small" }, "Choose from library");
    const clear = h("button", { type: "button", class: "a-btn small" }, "Remove photo");
    function paint() {
      const v = get() || "";
      input.value = v;
      if (v) thumb.setAttribute("src", v); else thumb.removeAttribute("src");
      clear.hidden = !v;
    }
    function apply(v) { set(v); touch(); paint(); }
    input.addEventListener("input", () => { set(input.value.trim()); touch(); const v = input.value.trim(); if (v) thumb.setAttribute("src", v); else thumb.removeAttribute("src"); clear.hidden = !v; });
    up.addEventListener("click", () => file.click());
    lib.addEventListener("click", () => openLibrary(apply));
    clear.addEventListener("click", () => apply(""));
    file.addEventListener("change", async () => {
      const f = file.files && file.files[0];
      file.value = "";
      if (!f) return;
      up.disabled = true; up.textContent = "Uploading…"; err.hidden = true;
      try { apply(await uploadPhoto(f)); }
      catch (e) { err.textContent = e.message; err.hidden = false; }
      up.disabled = false; up.textContent = "Upload photo";
    });
    paint();
    return h("div", { class: "a-field" }, h("span", { class: "a-label" }, label),
      h("div", { class: "a-image" }, thumb, h("div", { class: "a-image-main" }, input, h("div", { class: "a-tools" }, up, lib, clear), err, file)));
  }

  /* ---------- tab: page text ---------- */
  const TEXT_GROUPS = [
    { title: "Top of the homepage", fields: [
      ["heroTitle", "Headline"], ["heroText", "Paragraph", 3], ["heroBtn1", "First button"], ["heroBtn2", "Second button"], ["heroImage", "Hero photo", "image"] ] },
    { title: "“Why Daya” section", fields: [
      ["whyTitle", "Heading"], ["whySub", "Line under the heading"],
      ["why1Title", "Point 1 title"], ["why1Text", "Point 1 text", 2],
      ["why2Title", "Point 2 title"], ["why2Text", "Point 2 text", 2],
      ["why3Title", "Point 3 title"], ["why3Text", "Point 3 text", 2] ] },
    { title: "Homepage sections", fields: [
      ["occasionsTitle", "Occasions: heading"], ["occasionsSub", "Occasions: line under it", 2],
      ["bestTitle", "Best looks: heading"], ["bestSub", "Best looks: line under it", 2],
      ["affordableTitle", "Most affordable: heading"], ["affordableSub", "Most affordable: line under it", 2],
      ["toolsTitle", "Calculator and size chart: heading"], ["toolsSub", "Calculator and size chart: line under it", 2],
      ["dealsTitle", "Best deals: heading"], ["dealsSub", "Best deals: line under it", 2],
      ["journalTitle", "Journal: heading"], ["journalSub", "Journal: line under it", 2] ] },
    { title: "Stylist offers (shown on every page)", fields: [
      ["stripText", "Line under the header"], ["bandTitle", "Bottom box: heading"], ["bandText", "Bottom box: text", 2], ["bandButton", "Bottom box: button"] ] },
    { title: "Footer", fields: [["footerTag", "Footer line"]] }
  ];

  function textTab(panel) {
    const t = S.content.text;
    TEXT_GROUPS.forEach((g) => {
      panel.append(card(g.title, g === TEXT_GROUPS[0] ? "Leave a box empty to use the original wording." : "", g.fields.map(([key, label, extra]) =>
        extra === "image"
          ? imageField(label, () => t[key], (v) => { t[key] = v; })
          : field(label, () => t[key], (v) => { t[key] = v; }, { rows: typeof extra === "number" ? extra : 0, placeholder: DEFAULTS.text[key] }))));
    });
  }

  /* ---------- tab: looks ---------- */
  function newLook() {
    return { id: "look-" + Date.now().toString(36), name: "New look", brand: "", occasion: S.content.occasions[0] ? S.content.occasions[0].slug : "", bodies: [], price: 0, currency: "NGN", featured: false, visible: true, url: "", fabric: "", styling: "", image: "" };
  }

  function lookItem(l, i) {
    const c = S.content;
    const thumb = h("img", { class: "a-thumb", alt: "" });
    const title = h("p", { class: "a-item-title" });
    const meta = h("p", { class: "a-item-meta" });
    function paint() {
      title.textContent = l.name || "Untitled look";
      if (l.visible === false) title.append(h("span", { class: "a-badge" }, "Hidden"));
      if (l.featured) title.append(h("span", { class: "a-badge" }, "Best look"));
      meta.textContent = occName(l.occasion) + " · " + money(l.price, l.currency) + (l.was ? " (was " + money(l.was, l.currency) + ")" : "");
      if (l.image) thumb.setAttribute("src", l.image); else thumb.removeAttribute("src");
    }
    paint();
    const d = h("details", { class: "a-item" });
    d.open = openItems.has(l.id);
    d.addEventListener("toggle", () => { if (d.open) openItems.add(l.id); else openItems.delete(l.id); });
    d.append(h("summary", {}, thumb, h("div", {}, title, meta)));

    const bodyBoxes = c.bodyTypes.map((b) => {
      const input = h("input", { type: "checkbox" });
      input.checked = l.bodies.includes(b.slug);
      input.addEventListener("change", () => {
        l.bodies = input.checked ? [...new Set([...l.bodies, b.slug])] : l.bodies.filter((x) => x !== b.slug);
        touch();
      });
      return h("label", { class: "a-check" }, input, h("span", {}, b.name));
    });

    d.append(h("div", { class: "a-item-body" },
      field("Name", () => l.name, (v) => { l.name = v; }, { onInput: paint }),
      h("div", { class: "a-row2" },
        field("Brand or shop (optional)", () => l.brand, (v) => { l.brand = v; }),
        select("Occasion", c.occasions.map((o) => ({ value: o.slug, label: o.name })), () => l.occasion, (v) => { l.occasion = v; paint(); })),
      h("div", { class: "a-row2" },
        field("Price", () => l.price, (v) => { l.price = v === "" ? 0 : Number(v); }, { type: "number", inputmode: "decimal", step: "any", min: 0, onInput: paint }),
        select("Currency", [{ value: "NGN", label: "Naira (₦)" }, { value: "USD", label: "Dollars ($)" }], () => l.currency, (v) => { l.currency = v; paint(); }, "“Most affordable” only ranks looks priced in naira.")),
      field("Old price (optional)", () => (l.was ? l.was : ""), (v) => { if (v === "") delete l.was; else l.was = Number(v); }, { type: "number", inputmode: "decimal", step: "any", min: 0, onInput: paint, hint: "Fill this in only for a real discount. Looks with an old price appear under “Best deals”." }),
      h("div", { class: "a-field" }, h("span", { class: "a-label" }, "Body types this suits"), h("div", { class: "a-checks" }, bodyBoxes)),
      field("Shop link (optional)", () => l.url, (v) => { l.url = v.trim(); }, { type: "url", placeholder: "https://…", hint: "Where shoppers can buy it. Without a link, the button says “Ask a stylist”." }),
      field("Fabric (optional)", () => l.fabric, (v) => { l.fabric = v; }, { placeholder: "e.g. Satin, stretch" }),
      field("How to style it (optional)", () => l.styling, (v) => { l.styling = v; }, { rows: 3 }),
      imageField("Photo", () => l.image, (v) => { l.image = v; paint(); }),
      check("Show under “Best looks” on the homepage", () => l.featured, (v) => { l.featured = v; paint(); }),
      check("Show this look on the site", () => l.visible !== false, (v) => { l.visible = v; paint(); }, "Untick to hide it without deleting it."),
      h("div", { class: "a-tools" },
        h("button", { type: "button", class: "a-btn small", disabled: i === 0, onclick: () => { swap(c.looks, i, -1); rerender(); touch(); } }, "Move up"),
        h("button", { type: "button", class: "a-btn small", disabled: i === c.looks.length - 1, onclick: () => { swap(c.looks, i, 1); rerender(); touch(); } }, "Move down"),
        h("button", { type: "button", class: "a-btn small", onclick: () => { const cp = JSON.parse(JSON.stringify(l)); cp.id = "look-" + Date.now().toString(36); cp.name += " (copy)"; c.looks.splice(i + 1, 0, cp); openItems.add(cp.id); rerender(); touch(); } }, "Duplicate"),
        h("a", { class: "a-btn small", href: "look.html?id=" + encodeURIComponent(l.id), target: "_blank", rel: "noopener", style: "display:inline-flex;align-items:center;text-decoration:none;color:inherit" }, "View on site"),
        h("button", { type: "button", class: "a-btn small danger", onclick: () => { if (confirm("Delete “" + (l.name || "this look") + "”? This can't be undone once you save.")) { c.looks.splice(i, 1); rerender(); touch(); } } }, "Delete"))));
    return d;
  }

  function looksTab(panel) {
    const c = S.content;
    ensureSlugs();
    panel.append(card("Looks (" + c.looks.length + ")", "Tap a look to edit it. The first four looks marked “Best look” appear on the homepage.",
      h("button", { type: "button", class: "a-btn primary", onclick: () => { const nl = newLook(); c.looks.unshift(nl); openItems.add(nl.id); rerender(); touch(); } }, "Add a look")));
    c.looks.forEach((l, i) => panel.append(lookItem(l, i)));
  }

  /* ---------- tab: journal ---------- */
  function articleItem(a, i) {
    const c = S.content;
    const title = h("p", { class: "a-item-title" });
    const meta = h("p", { class: "a-item-meta" });
    function paint() {
      title.textContent = a.title || "Untitled article";
      if (a.visible === false) title.append(h("span", { class: "a-badge" }, "Draft"));
      meta.textContent = (a.date || "") + " · " + (a.readMins || 3) + " min read";
    }
    paint();
    const d = h("details", { class: "a-item" });
    d.open = openItems.has(a.id);
    d.addEventListener("toggle", () => { if (d.open) openItems.add(a.id); else openItems.delete(a.id); });
    d.append(h("summary", {}, h("div", {}, title, meta)));

    let minsField;
    const bodyField = field("Article", () => a.body.join("\n\n"), (v) => {
      a.body = v.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
      if (!a._manualMins) {
        const words = a.body.join(" ").split(/\s+/).filter(Boolean).length;
        a.readMins = Math.max(1, Math.round(words / 180));
        minsField.control.value = a.readMins;
      }
    }, { rows: 14, hint: "Leave a blank line between paragraphs. Start a line with ## to make it a sub-heading." });
    minsField = field("Minutes to read", () => a.readMins, (v) => { a.readMins = Math.max(1, parseInt(v, 10) || 1); a._manualMins = true; }, { type: "number", inputmode: "numeric", min: 1, onInput: paint });

    d.append(h("div", { class: "a-item-body" },
      field("Title", () => a.title, (v) => { a.title = v; }, { onInput: paint }),
      h("div", { class: "a-row2" },
        field("Date", () => a.date, (v) => { a.date = v; }, { type: "date", onInput: paint }),
        minsField),
      field("Short summary", () => a.excerpt, (v) => { a.excerpt = v; }, { rows: 2, hint: "Shown on the journal page and under the title." }),
      imageField("Photo (optional)", () => a.image, (v) => { a.image = v; }),
      bodyField,
      check("Published", () => a.visible !== false, (v) => { a.visible = v; paint(); }, "Untick to keep it as a draft that visitors can't see."),
      h("div", { class: "a-tools" },
        h("a", { class: "a-btn small", href: "article.html?id=" + encodeURIComponent(a.id), target: "_blank", rel: "noopener", style: "display:inline-flex;align-items:center;text-decoration:none;color:inherit" }, "View on site"),
        h("button", { type: "button", class: "a-btn small danger", onclick: () => { if (confirm("Delete “" + (a.title || "this article") + "”?")) { c.articles.splice(i, 1); rerender(); touch(); } } }, "Delete"))));
    return d;
  }

  function journalTab(panel) {
    const c = S.content;
    panel.append(card("Journal (" + c.articles.length + ")", "Short write-ups for your visitors. Newest first on the site.",
      h("button", { type: "button", class: "a-btn primary", onclick: () => {
        const na = { id: "article-" + Date.now().toString(36), title: "New article", date: today(), readMins: 1, excerpt: "", image: "", body: [], visible: false };
        c.articles.unshift(na); openItems.add(na.id); rerender(); touch();
      } }, "Write an article")));
    c.articles.slice().forEach((a) => panel.append(articleItem(a, c.articles.indexOf(a))));
  }

  /* ---------- tab: occasions + body types ---------- */
  function listCard(title, sub, key, withDesc, noun) {
    const c = S.content;
    const list = c[key];
    const rows = list.map((item, i) => {
      const name = field("Name", () => item.name, (v) => { item.name = v; }, { });
      const desc = withDesc ? field("Short description", () => item.desc, (v) => { item.desc = v; }, { rows: 2 }) : null;
      const tools = h("div", { class: "a-tools" },
        h("button", { type: "button", class: "a-btn small", disabled: i === 0, "aria-label": "Move up", onclick: () => { swap(list, i, -1); rerender(); touch(); } }, "Up"),
        h("button", { type: "button", class: "a-btn small", disabled: i === list.length - 1, "aria-label": "Move down", onclick: () => { swap(list, i, 1); rerender(); touch(); } }, "Down"),
        h("button", { type: "button", class: "a-btn small danger", onclick: () => {
          if (list.length <= 1) { alert("Keep at least one " + noun + "."); return; }
          const users = c.looks.filter((l) => (key === "occasions" ? l.occasion === item.slug : l.bodies.includes(item.slug))).length;
          const warn = users ? "\n\n" + users + " look(s) use it. They'll stay on the site but lose this " + noun + "." : "";
          if (!confirm("Delete “" + (item.name || noun) + "”?" + warn)) return;
          c.looks.forEach((l) => { if (key === "occasions") { if (l.occasion === item.slug) l.occasion = ""; } else l.bodies = l.bodies.filter((x) => x !== item.slug); });
          list.splice(i, 1); rerender(); touch();
        } }, "Delete"));
      return h("div", { class: "a-line " + (withDesc ? "with-desc" : "no-desc") }, name, desc, tools);
    });
    return h("section", { class: "a-card" }, h("h2", {}, title), h("p", { class: "a-sub" }, sub), rows,
      h("button", { type: "button", class: "a-btn a-add", onclick: () => { list.push(withDesc ? { slug: "", name: "", desc: "" } : { slug: "", name: "" }); rerender(); touch(); } }, (/^[aeiou]/i.test(noun) ? "Add an " : "Add a ") + noun));
  }

  function listsTab(panel) {
    panel.append(
      listCard("Occasions", "These appear as choices on the Looks page and in the Browse menu. Renaming keeps your looks linked.", "occasions", false, "occasion"),
      listCard("Body types", "Each one gets a short description on the size chart page.", "bodyTypes", true, "body type"));
  }

  /* ---------- tab: affirmation + contact ---------- */
  function settingsTab(panel) {
    const cfg = S.content.config;
    const preview = h("div", { class: "a-preview" }, h("span", {}, "Showing on the site right now"), h("b", {}));
    const paintPreview = () => { preview.querySelector("b").textContent = currentAffirmation(cfg) || "(nothing yet)"; };
    paintPreview();
    panel.append(
      card("Weekly affirmation", "Shown as a small “This week” tab on every page and as a line on the homepage, in cursive. It moves to the next sentence every Monday, or you can type one sentence to show instead.",
        preview,
        field("Show this sentence instead (optional)", () => cfg.affirmationOverride, (v) => { cfg.affirmationOverride = v; }, { onInput: paintPreview, hint: "Leave empty to let the weekly list run." }),
        field("Weekly list (one sentence per line)", () => (cfg.affirmations || []).join("\n"), (v) => { cfg.affirmations = v.split("\n").map((s) => s.trim()).filter(Boolean); }, { rows: 10, onInput: paintPreview, hint: "The first line is used in the week that begins on the date below." }),
        field("First week starts on (a Monday)", () => cfg.affirmationStart, (v) => { cfg.affirmationStart = v; }, { type: "date", onInput: paintPreview })),
      card("Stylist contact", "Where “Book a stylist” and “Chat with a stylist” send people.",
        field("WhatsApp number", () => cfg.whatsapp, (v) => { cfg.whatsapp = v; }, {
          inputmode: "tel", hint: "Country code and number, digits only. For example 2348089484402. If you type 08089484402 we'll fix it for you.",
          onBlur: (el) => { const d = el.value.replace(/\D/g, ""); const fixed = /^0\d{10}$/.test(d) ? "234" + d.slice(1) : d; if (fixed !== el.value) { el.value = fixed; cfg.whatsapp = fixed; touch(); } } }),
        field("Email", () => cfg.email, (v) => { cfg.email = v.trim(); }, { type: "email", hint: "Used for booking requests if there is no WhatsApp number." })),
      card("Prices and photos", "",
        field("Dollar to naira rate", () => cfg.usdToNgn, (v) => { cfg.usdToNgn = Number(v) || 1500; }, { type: "number", inputmode: "decimal", step: "any", min: 1, hint: "Only used to sort looks priced in different currencies." }),
        check("Serve smaller photos to make pages faster", () => cfg.imageResize, (v) => { cfg.imageResize = v; }, "Only turn this on if your Supabase plan includes image resizing, otherwise photos may not appear.")));
  }

  /* ---------- the editor shell ---------- */
  const TABS = [["text", "Page text"], ["looks", "Looks"], ["journal", "Journal"], ["lists", "Occasions & body types"], ["settings", "Affirmation & contact"]];
  const RENDER = { text: textTab, looks: looksTab, journal: journalTab, lists: listsTab, settings: settingsTab };
  let panelEl, statusEl, saveBtn, tabsEl;

  function rerender() {
    ensureSlugs();
    const y = window.scrollY;
    panelEl.replaceChildren();
    RENDER[S.tab](panelEl);
    window.scrollTo(0, y);
  }

  function setStatus(text, isErr) {
    statusEl.textContent = text;
    statusEl.classList.toggle("err", !!isErr);
  }
  function paintSaveBar() {
    if (!saveBtn) return;
    saveBtn.disabled = S.saving || !S.dirty;
    saveBtn.textContent = S.saving ? "Saving…" : "Save changes";
    if (S.dirty && !S.saving && !statusEl.classList.contains("err")) setStatus("You have unsaved changes.");
  }

  async function save() {
    if (S.saving || !S.dirty) return;
    ensureSlugs();
    S.saving = true; statusEl.classList.remove("err"); setStatus("Saving…"); paintSaveBar();
    try {
      await api("save", { body: { content: S.content } });
      S.dirty = false;
      setStatus("Saved. Visitors will see the changes within about 30 seconds.");
    } catch (e) {
      S.dirty = true;
      setStatus(e.status === 401 ? "Your session ended. Open /admin in a new tab, sign in, then press Save here. Your edits are still here." : e.message, true);
    }
    S.saving = false; paintSaveBar();
  }

  function renderEditor() {
    statusEl = h("p", { class: "a-status", role: "status" }, "No changes yet.");
    saveBtn = h("button", { type: "button", class: "a-btn primary", disabled: true, onclick: save }, "Save changes");
    tabsEl = h("div", { class: "a-tabs", role: "tablist" }, TABS.map(([id, label]) =>
      h("button", { type: "button", role: "tab", class: "a-tab", "aria-selected": String(S.tab === id), onclick: (e) => {
        S.tab = id;
        tabsEl.querySelectorAll(".a-tab").forEach((b) => b.setAttribute("aria-selected", "false"));
        e.currentTarget.setAttribute("aria-selected", "true");
        rerender();
        window.scrollTo(0, 0);
      } }, label)));
    panelEl = h("div", { id: "panel" });
    app.replaceChildren(
      h("div", { class: "a-wrap" },
        h("div", { class: "a-top" },
          h("p", { class: "a-brand" }, "Daya", h("small", {}, "ADMIN")),
          h("div", { class: "a-top-links" },
            h("a", { href: "/", target: "_blank", rel: "noopener" }, "View site"),
            h("button", { type: "button", class: "linklike", onclick: async () => { if (S.dirty && !confirm("You have unsaved changes. Sign out anyway?")) return; S.dirty = false; try { await api("logout", { body: {} }); } catch (e) { /* ignore */ } showLogin(); } }, "Sign out"))),
        S.storageOk ? null : h("p", { class: "a-banner warn" }, "Storage isn't connected yet, so saving and uploads won't work. Add the Supabase values in Vercel (see ADMIN_SETUP.md)."),
        tabsEl, panelEl),
      h("div", { class: "a-savebar" }, h("div", { class: "a-wrap" }, statusEl, saveBtn)));
    rerender();
  }

  /* ---------- sign in + start ---------- */
  function showLogin(message) {
    const err = h("p", { class: "a-err", role: "alert", hidden: !message }, message || "");
    const pw = h("input", { type: "password", id: "pw", autocomplete: "current-password", required: true });
    const btn = h("button", { type: "submit", class: "a-btn primary" }, "Sign in");
    const form = h("form", { onsubmit: async (e) => {
      e.preventDefault(); err.hidden = true; btn.disabled = true;
      try { await api("login", { body: { password: pw.value } }); await openEditor(); }
      catch (x) { err.textContent = x.message; err.hidden = false; btn.disabled = false; pw.select(); }
    } }, h("div", { class: "a-field" }, h("label", { for: "pw" }, "Password"), pw), err, btn);
    app.replaceChildren(h("div", { class: "a-login" }, h("h1", {}, "Daya admin"), h("p", { class: "a-sub" }, "Sign in to edit your site."), form));
    pw.focus();
  }

  function showMessage(title, lines) {
    app.replaceChildren(h("div", { class: "a-login" }, h("h1", {}, title), lines.map((l) => h("p", {}, l))));
  }

  async function openEditor() {
    app.replaceChildren(h("p", { class: "a-loading" }, "Loading your site…"));
    try {
      const r = await api("adminload");
      S.storageOk = r.storageConfigured;
      S.content = mergeContent(r.data);
      S.dirty = false;
      renderEditor();
    } catch (e) {
      if (e.status === 401) return showLogin();
      showMessage("Couldn't load your content", [e.message, "Check the setup steps in ADMIN_SETUP.md, then refresh this page."]);
    }
  }

  (async function start() {
    try {
      const me = await api("me");
      if (!me.authConfigured) {
        return showMessage("Admin isn't set up yet", ["Add ADMIN_PASSWORD and ADMIN_SESSION_SECRET in your Vercel project settings, then redeploy.", "The steps are in ADMIN_SETUP.md."]);
      }
      if (!me.signedIn) return showLogin();
      await openEditor();
    } catch (e) {
      showMessage("Can't reach the admin", ["The admin service isn't responding. If you just uploaded the files, make sure api/site.js is in your repo and Vercel has finished deploying.", e.message]);
    }
  })();
})();
