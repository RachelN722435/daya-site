/* Daya — page scripts. Each page sets <body data-page="..."> and gets its own function. */
(function () {
  var D = window.DAYA;
  var U = window.DayaUI;
  var esc = U.esc;
  var params = new URLSearchParams(location.search);
  function $(s, r) { return (r || document).querySelector(s); }

  /* ---------- shared collections ---------- */
  function ngn(l) { return U.toNgn(l.price, l.currency); }
  function affordable() {
    return D.looks.slice().sort(function (a, b) { return ngn(a) - ngn(b); });
  }
  function deals() {
    return D.looks.filter(function (l) { return l.was; })
      .sort(function (a, b) { return U.discount(b) - U.discount(a); });
  }
  function fillGrid(sel, list, max) {
    var el = $(sel);
    if (!el) return;
    el.innerHTML = list.slice(0, max || 4).map(U.lookCard).join("");
  }
  function fmtDate(iso) {
    var d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }
  function articleCard(a) {
    return '<article class="post">' +
      (a.image ? '<img src="' + esc(a.image) + '" alt="" loading="lazy">' : "") +
      '<p class="post-meta">' + fmtDate(a.date) + " · " + a.readMins + ' min read</p>' +
      '<h3 class="post-title"><a href="article.html?id=' + encodeURIComponent(a.id) + '">' + esc(a.title) + '</a></h3>' +
      '<p class="post-excerpt">' + esc(a.excerpt) + '</p>' +
      '</article>';
  }

  /* the Fit Card: everything a shopper needs to know about fit, in one place */
  function fitCard(l, suits) {
    var rows = [
      ["Suits", suits], ["Why it flatters", l.fitNote], ["Fabric", l.fabric],
      ["Length", l.length], ["Model wears", l.modelInfo], ["Sizing tip", l.sizeTip]
    ].filter(function (r) { return r[1]; });
    if (!rows.length) return "";
    return '<section class="fit-card" aria-labelledby="fit-h"><h2 id="fit-h">Fit Card</h2><dl>' +
      rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join("") +
      '</dl><p class="fit-foot">Not sure it’s right for you? <a href="stylist.html?look=' + encodeURIComponent(l.id) + '#book">Ask a stylist about this look</a> or <a href="size-chart.html">check the size chart</a>.</p></section>';
  }

  var pages = {

    /* ---------------- HOME ---------------- */
    home: function () {
      fillGrid("#grid-affordable", affordable(), 4);
      fillGrid("#grid-deals", deals(), 4);

      /* "Why Daya" opens as a pop-up instead of taking space on the page */
      var open = $("#why-open"), modal = $("#why-modal");
      if (!open || !modal) return;
      var closeBtn = $("#why-close");
      function setOpen(on) {
        modal.hidden = !on;
        document.documentElement.classList.toggle("no-scroll", on);
        open.setAttribute("aria-expanded", String(on));
        if (on) closeBtn.focus(); else open.focus();
      }
      open.addEventListener("click", function () { setOpen(true); });
      closeBtn.addEventListener("click", function () { setOpen(false); });
      modal.addEventListener("click", function (e) { if (e.target === modal) setOpen(false); });
      document.addEventListener("keydown", function (e) {
        if (modal.hidden) return;
        if (e.key === "Escape") setOpen(false);
        if (e.key === "Tab") {                               /* keep focus inside the pop-up */
          var f = modal.querySelectorAll("a[href], button");
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    },

    /* ---------------- SHOP: occasions, vibes, body types, marketplace ---------------- */
    shop: function () {
      var mode = document.body.getAttribute("data-mode") || "marketplace";
      var MODES = {
        occasions: { focus: "occ", crumb: "Occasions", title: "Shop by Occasion", desc: "Choose one or more occasions, then narrow by body type, colour or price." },
        vibes: { focus: "vibe", crumb: "Era & Vibe", title: "Shop by Era & Vibe", desc: "From vintage to old money. Choose the feeling you’re after and mix as many as you like." },
        bodies: { focus: "body", crumb: "Body types", title: "Shop by Body Type", desc: "Pick the shape closest to yours and see looks chosen to flatter it." },
        marketplace: { focus: "price", crumb: "Marketplace", title: "The Marketplace", desc: "Every outfit on Daya in one place. Filter by price, deals, colour and more." }
      };
      var M = MODES[mode] || MODES.marketplace;
      var COLOURS = { black: "#1F1F1F", white: "#FFFBF7", ivory: "#F3E9DA", cream: "#F3E9DA", beige: "#D9C3A5", nude: "#D7B8A0", tan: "#B98D61", brown: "#7B5236", chocolate: "#4E2E20", red: "#B3262E", burgundy: "#6D1A2B", wine: "#6D1A2B", maroon: "#6D1A2B", pink: "#F2A7BE", blush: "#F4CFCB", orange: "#E27D3A", rust: "#A64B2A", yellow: "#F0CE5A", gold: "#D6B05A", green: "#3E7D4F", olive: "#6B7040", emerald: "#1F7A55", teal: "#1F7A7A", blue: "#2F5D9E", navy: "#1B2A4A", purple: "#6B4A8E", lilac: "#C9B6E0", lavender: "#C9B6E0", grey: "#8E8E8E", gray: "#8E8E8E", silver: "#C0C0C0" };

      function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1); }
      function listParam(name, valid) {
        var raw = params.get(name);
        if (!raw) return [];
        return raw.split(",").map(function (x) { return x.trim().toLowerCase(); }).filter(function (x, i, a) {
          return x && a.indexOf(x) === i && (!valid || valid.indexOf(x) !== -1);
        });
      }
      function slugs(list) { return list.map(function (x) { return x.slug; }); }

      var colourSet = [];
      D.looks.forEach(function (l) { l.colours.forEach(function (c) { if (colourSet.indexOf(c) === -1) colourSet.push(c); }); });
      colourSet.sort();

      var SORTS = { low: 1, high: 1, deal: 1 };
      var state = {
        occ: listParam("occasion", slugs(D.occasions)),
        vibe: listParam("vibe", slugs(D.vibes)),
        body: listParam("body", slugs(D.bodyTypes)),
        col: listParam("colour", colourSet),
        min: "", max: "",
        deals: params.get("deals") === "1",
        sort: SORTS[params.get("sort")] ? params.get("sort") : "",
        view: ""
      };
      var view = params.get("collection");
      if (view === "affordable") { state.view = view; if (!state.sort) state.sort = "low"; }
      if (view === "deals") { state.view = view; state.deals = true; if (!state.sort) state.sort = "deal"; }

      var GROUPS = [
        { key: "occ", label: "Occasion", items: D.occasions, field: "occasions" },
        { key: "vibe", label: "Era & vibe", items: D.vibes, field: "vibes" },
        { key: "body", label: "Body type", items: D.bodyTypes, field: "bodies" },
        { key: "col", label: "Colour", items: colourSet.map(function (c) { return { slug: c, name: cap(c) }; }), field: "colours" },
        { key: "price", label: "Price & deals" }
      ].filter(function (g) { return g.key === "price" || g.items.length; });
      GROUPS.sort(function (a, b) { return (b.key === M.focus) - (a.key === M.focus); });

      var dc = U.displayCurrency();
      var sym = U.CURS[dc].sym;
      var rate = U.rateOf(dc);
      function countFor(g, slug) {
        return D.looks.filter(function (l) { return l[g.field].indexOf(slug) !== -1; }).length;
      }

      function chip(g, it) {
        var n = countFor(g, it.slug);
        var dot = g.key === "col" && COLOURS[it.slug] ? '<span class="dot" style="background:' + COLOURS[it.slug] + '"></span>' : "";
        var pic = it.image ? '<img class="chip-img" src="' + esc(U.img(it.image, 80)) + '" alt="" loading="lazy" decoding="async">' : "";
        return '<button type="button" class="chip' + (n ? "" : " dim") + '" data-g="' + g.key + '" data-v="' + esc(it.slug) + '" aria-pressed="false">' + pic + dot + esc(it.name) + ' <span class="chip-n">' + n + '</span></button>';
      }
      var fbox = $("#shop-filters");
      fbox.innerHTML = GROUPS.map(function (g) {
        var body;
        if (g.key === "price") {
          body = '<div class="price-row"><label>From (' + sym + ')<input id="p-min" type="number" inputmode="numeric" min="0" placeholder="Any"></label>' +
            '<label>To (' + sym + ')<input id="p-max" type="number" inputmode="numeric" min="0" placeholder="Any"></label></div>' +
            '<label class="a-check deal-check"><input type="checkbox" id="p-deals"><span>On sale only (best deals)</span></label>';
        } else {
          body = '<div class="chips">' + g.items.map(function (it) { return chip(g, it); }).join("") + '</div>' +
            (g.key === "body" ? '<p class="hint"><a href="calculator.html">Not sure of your body type? Use the body calculator</a></p>' : "");
        }
        var focus = g.key === M.focus;
        var active = g.key === "price" ? state.deals : state[g.key].length > 0;
        return '<details class="fgroup' + (focus ? " focus" : "") + '" data-group="' + g.key + '"' + (focus || active ? " open" : "") + '><summary><span>' + g.label + '</span><span class="fcount" data-count="' + g.key + '"></span></summary>' + body + '</details>';
      }).join("");

      var title = $("#shop-title"), desc = $("#shop-desc"), head = $("#shop-head");
      $("#shop-crumb").textContent = M.crumb;
      var elMin = $("#p-min"), elMax = $("#p-max"), elDeals = $("#p-deals");
      var selSort = $("#f-sort");

      function itemOf(list, slug) { for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return list[i]; return null; }
      function matches(l) {
        if (state.occ.length && !state.occ.some(function (x) { return l.occasions.indexOf(x) !== -1; })) return false;
        if (state.vibe.length && !state.vibe.some(function (x) { return l.vibes.indexOf(x) !== -1; })) return false;
        if (state.body.length && !state.body.some(function (x) { return l.bodies.indexOf(x) !== -1; })) return false;
        if (state.col.length && !state.col.some(function (x) { return l.colours.indexOf(x) !== -1; })) return false;
        if (state.deals && !l.was) return false;
        var p = ngn(l) / rate;
        if (state.min !== "" && p < Number(state.min) - 0.5) return false;
        if (state.max !== "" && p > Number(state.max) + 0.5) return false;
        return true;
      }
      function anyActive() {
        return state.occ.length || state.vibe.length || state.body.length || state.col.length || state.deals || state.min !== "" || state.max !== "" || state.view;
      }

      function render() {
        Array.prototype.forEach.call(fbox.querySelectorAll(".chip"), function (c) {
          c.setAttribute("aria-pressed", String(state[c.getAttribute("data-g")].indexOf(c.getAttribute("data-v")) !== -1));
        });
        GROUPS.forEach(function (g) {
          var n = g.key === "price" ? (state.deals ? 1 : 0) + (state.min !== "" || state.max !== "" ? 1 : 0) : state[g.key].length;
          var el = fbox.querySelector('[data-count="' + g.key + '"]');
          el.textContent = n ? n + " selected" : "";
        });
        elDeals.checked = state.deals;
        selSort.value = state.sort;

        var heading = state.view === "affordable" ? "Most affordable" : state.view === "deals" ? "Best deals" : M.title;
        title.textContent = heading;
        document.title = heading + " | Daya";
        var text = M.desc, banner = "";
        if (state.view === "affordable") text = "Great outfits that are kind to your budget, starting with the lowest price.";
        if (state.view === "deals") text = "Looks with the biggest savings, from the largest discount down.";
        var fk = M.focus;
        if (state[fk] && state[fk].length === 1) {
          var src = fk === "occ" ? D.occasions : fk === "vibe" ? D.vibes : D.bodyTypes;
          var it = itemOf(src, state[fk][0]);
          if (it) { banner = it.image || ""; if (it.desc) text = it.desc; }
        }
        desc.textContent = text;
        if (banner) {
          head.style.backgroundImage = "url(" + String(U.img(banner, 1400)).replace(/["'()\\\s]/g, function (ch) { return "%" + ch.charCodeAt(0).toString(16).toUpperCase(); }) + ")";
        } else head.style.backgroundImage = "";
        head.classList.toggle("has-banner", !!banner);

        var list = D.looks.filter(matches);
        if (state.sort === "low") list.sort(function (a, b) { return ngn(a) - ngn(b); });
        if (state.sort === "high") list.sort(function (a, b) { return ngn(b) - ngn(a); });
        if (state.sort === "deal") list.sort(function (a, b) { return (b.was ? U.discount(b) : 0) - (a.was ? U.discount(a) : 0); });

        $("#shop-count").textContent = list.length + (list.length === 1 ? " look" : " looks");
        $("#shop-grid").innerHTML = list.map(U.lookCard).join("");
        $("#shop-empty").hidden = list.length > 0;
        $("#f-reset").hidden = !anyActive();

        var q = new URLSearchParams();
        if (state.occ.length) q.set("occasion", state.occ.join(","));
        if (state.vibe.length) q.set("vibe", state.vibe.join(","));
        if (state.body.length) q.set("body", state.body.join(","));
        if (state.col.length) q.set("colour", state.col.join(","));
        if (state.view) q.set("collection", state.view); else if (state.deals) q.set("deals", "1");
        if (state.sort) q.set("sort", state.sort);
        var qs = q.toString();
        try { history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "")); } catch (e) { /* ignore */ }
      }

      fbox.addEventListener("click", function (e) {
        var c = e.target.closest(".chip");
        if (!c) return;
        var arr = state[c.getAttribute("data-g")], v = c.getAttribute("data-v"), i = arr.indexOf(v);
        if (i === -1) arr.push(v); else arr.splice(i, 1);
        render();
      });
      elMin.addEventListener("input", function () { state.min = elMin.value.trim(); render(); });
      elMax.addEventListener("input", function () { state.max = elMax.value.trim(); render(); });
      elDeals.addEventListener("change", function () { state.deals = elDeals.checked; if (!state.deals && state.view === "deals") state.view = ""; render(); });
      selSort.addEventListener("change", function () { state.sort = selSort.value; render(); });
      $("#f-reset").addEventListener("click", function () {
        state.occ = []; state.vibe = []; state.body = []; state.col = []; state.min = ""; state.max = "";
        state.deals = false; state.sort = ""; state.view = ""; elMin.value = ""; elMax.value = "";
        render();
      });
      render();
    },

    /* ---------------- LOOK (single outfit) ---------------- */
    look: function () {
      var id = params.get("id");
      var l = U.byId(id);
      var box = $("#look");
      if (!l) {
        box.innerHTML = '<h1 class="page-title">We couldn’t find that look</h1><p class="lede">It may have moved. <a href="marketplace.html">Browse the marketplace</a>.</p>';
        return;
      }
      document.title = l.name + " | Daya";
      var d = U.discount(l);
      var suits = (l.bodies || []).map(U.bodyName).join(", ");
      var retailer = l.url
        ? '<a class="btn btn-primary" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">View at retailer</a>'
        : '<a class="btn btn-primary" href="stylist.html?look=' + encodeURIComponent(l.id) + '">Ask a stylist about this</a>';
      box.innerHTML =
        '<div class="look-grid">' +
          '<div class="look-media">' +
            (l.image ? '<img src="' + esc(U.img(l.image, 800)) + '" alt="' + esc(l.name) + '" decoding="async">' : "") +
            (d ? '<span class="deal-badge">' + d + '% off</span>' : "") +
          '</div>' +
          '<div class="look-info">' +
            '<p class="card-meta">' + esc(U.occasionName(l.occasion)) + (l.brand ? " · " + esc(l.brand) : "") + '</p>' +
            '<h1 class="page-title">' + esc(l.name) + '</h1>' +
            '<p class="look-price"><span class="now">' + U.price(l, "price") + '</span>' +
              (l.was ? ' <s class="was">' + U.price(l, "was") + '</s>' : "") + '</p>' +
            (l.occasions.length > 1 ? '<p class="look-fact"><strong>Great for</strong> ' + esc(l.occasions.map(U.occasionName).join(", ")) + '</p>' : "") +
            (l.vibes.length ? '<p class="look-fact"><strong>Vibe</strong> ' + esc(l.vibes.map(U.vibeName).join(", ")) + '</p>' : "") +
            (l.colours.length ? '<p class="look-fact"><strong>Colour</strong> ' + esc(l.colours.join(", ")) + '</p>' : "") +
            fitCard(l, suits) +
            (l.styling ? '<h2 class="look-sub">How to style it</h2><p class="look-note">' + esc(l.styling) + '</p>' : "") +
            '<div class="look-actions">' + retailer +
              '<button type="button" class="btn btn-ghost" id="look-save" data-save="' + esc(l.id) + '"></button>' +
              '<button type="button" class="btn btn-ghost" id="look-share">Share this look</button></div>' +
            '<p class="look-copy"><button type="button" class="linklike" id="look-copy">Copy link</button></p>' +
            '<p class="back"><a href="marketplace.html">← Back to the marketplace</a></p>' +
          '</div>' +
        '</div>';
      var saveBtn = $("#look-save");
      function label() { saveBtn.textContent = U.readBag().indexOf(l.id) !== -1 ? "Saved to your bag" : "Save to bag"; }
      label();
      document.addEventListener("daya:bag", label);

      var shareUrl = location.href;
      var shareText = l.name + " on Daya";
      $("#look-share").addEventListener("click", function () {
        if (navigator.share) {
          navigator.share({ title: shareText, text: shareText, url: shareUrl }).catch(function () { /* cancelled */ });
        } else {
          window.open("https://wa.me/?text=" + encodeURIComponent(shareText + " " + shareUrl), "_blank", "noopener");
        }
      });
      var copyBtn = $("#look-copy");
      copyBtn.addEventListener("click", function () {
        function done() { copyBtn.textContent = "Link copied"; setTimeout(function () { copyBtn.textContent = "Copy link"; }, 2000); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).then(done, function () { window.prompt("Copy this link:", shareUrl); });
        } else {
          window.prompt("Copy this link:", shareUrl);
        }
      });
    },

    /* ---------------- DAYA'S DIARY ---------------- */
    diary: function () {
      $("#journal-list").innerHTML = D.articles.map(articleCard).join("");
    },

    /* ---------------- ARTICLE ---------------- */
    article: function () {
      var id = params.get("id");
      var a = null;
      for (var i = 0; i < D.articles.length; i++) if (D.articles[i].id === id) a = D.articles[i];
      var box = $("#article");
      if (!a) {
        box.innerHTML = '<h1 class="page-title">We couldn’t find that article</h1><p class="lede">It may have moved. <a href="diary.html">Go back to Daya’s Diary</a>.</p>';
        return;
      }
      document.title = a.title + " | Daya";
      var html = '<p class="post-meta">' + fmtDate(a.date) + " · " + a.readMins + ' min read</p>' +
        '<h1 class="page-title">' + esc(a.title) + '</h1>' +
        '<p class="lede">' + esc(a.excerpt) + '</p>' +
        (a.image ? '<img class="article-img" src="' + esc(a.image) + '" alt="">' : "") +
        '<div class="prose">' + a.body.map(function (p) {
          return p.indexOf("## ") === 0 ? '<h2>' + esc(p.slice(3)) + '</h2>' : '<p>' + esc(p) + '</p>';
        }).join("") + '</div>' +
        '<p class="back"><a href="diary.html">← Back to Daya’s Diary</a></p>';
      box.innerHTML = html;
    },

    /* ---------------- SIZE CHART ---------------- */
    sizechart: function () {
      $("#body-guide").innerHTML = D.bodyTypes.map(function (b) {
        var photo = b.image ? '<img class="guide-img" src="' + esc(U.img(b.image, 400)) + '" alt="" loading="lazy" decoding="async">' : "";
        return '<div class="guide-item' + (b.image ? " has-img" : "") + '">' + photo + '<div><h3><a href="body-types.html?body=' + b.slug + '">' + esc(b.name) + '</a></h3><p>' + esc(b.desc) + '</p></div></div>';
      }).join("");
    },

    /* ---------------- CALCULATOR ---------------- */
    calculator: function () {
      var SIZES = [
        { uk: 6, us: 2, eu: 34, bust: 80, waist: 62, hip: 87 },
        { uk: 8, us: 4, eu: 36, bust: 84, waist: 66, hip: 91 },
        { uk: 10, us: 6, eu: 38, bust: 88, waist: 70, hip: 95 },
        { uk: 12, us: 8, eu: 40, bust: 92, waist: 74, hip: 99 },
        { uk: 14, us: 10, eu: 42, bust: 96, waist: 78, hip: 103 },
        { uk: 16, us: 12, eu: 44, bust: 101, waist: 83, hip: 108 },
        { uk: 18, us: 14, eu: 46, bust: 106, waist: 88, hip: 113 },
        { uk: 20, us: 16, eu: 48, bust: 111, waist: 93, hip: 118 },
        { uk: 22, us: 18, eu: 50, bust: 116, waist: 98, hip: 123 },
        { uk: 24, us: 20, eu: 52, bust: 121, waist: 103, hip: 128 }
      ];
      var form = $("#calc-form"), out = $("#calc-result"), err = $("#calc-error");

      function indexFor(value, key) {
        for (var i = 0; i < SIZES.length; i++) if (value <= SIZES[i][key] + 1) return i;
        return SIZES.length;           /* beyond our chart */
      }
      function bodyType(bust, waist, hip) {
        if (bust >= hip * 1.05) return waist / bust > 0.8 ? "athletic" : "inverted-triangle";
        if (hip >= bust * 1.05) return "pear";
        var wb = waist / bust, wh = waist / hip;
        if (wb <= 0.77) return "hourglass";
        if (wb >= 0.85 && wh >= 0.85) return "apple";
        return "rectangle";
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        err.hidden = true; out.hidden = true;
        var unit = form.unit.value, region = form.region.value;
        var k = unit === "in" ? 2.54 : 1;
        var bust = parseFloat(form.bust.value) * k;
        var waist = parseFloat(form.waist.value) * k;
        var hip = parseFloat(form.hip.value) * k;
        var height = form.height.value ? parseFloat(form.height.value) * (unit === "in" ? 2.54 : 1) : 0;

        if (!(bust > 0 && waist > 0 && hip > 0)) {
          err.textContent = "Enter your bust, waist and hip measurements to get your result.";
          err.hidden = false; return;
        }
        if (bust < 60 || bust > 200 || waist < 45 || waist > 200 || hip < 60 || hip > 220) {
          err.textContent = "Those measurements look off for " + (unit === "in" ? "inches" : "centimetres") + ". Check the unit and try again.";
          err.hidden = false; return;
        }

        var ib = indexFor(bust, "bust"), ih = indexFor(hip, "hip");
        var idx = Math.max(ib, ih);
        var beyond = idx >= SIZES.length;
        var size = beyond ? null : SIZES[idx];
        var type = bodyType(bust, waist, hip);
        var html = "";

        if (beyond) {
          html += '<p class="result-label">Your size</p><p class="result-size">Beyond our chart</p>' +
            '<p>Your measurements are larger than our printed chart. A stylist can help you find brands that cater to your size.</p>';
        } else {
          var label = region.toUpperCase() + " " + size[region];
          html += '<p class="result-label">Your size</p><p class="result-size">' + label + '</p>' +
            '<p class="result-alt">That’s UK ' + size.uk + ' · US ' + size.us + ' · EU ' + size.eu + '</p>';
          if (Math.abs(ib - ih) >= 2) {
            html += '<p class="result-note">Your bust and hips fall two or more sizes apart. Shop separates in different sizes where you can, and choose stretch or adjustable fabrics for dresses.</p>';
          }
        }

        var tname = U.bodyName(type);
        var tdesc = "";
        for (var i = 0; i < D.bodyTypes.length; i++) if (D.bodyTypes[i].slug === type) tdesc = D.bodyTypes[i].desc;
        html += '<hr class="result-rule"><p class="result-label">Your body type</p><p class="result-size">' + esc(tname) + '</p><p>' + esc(tdesc) + '</p>';
        html += '<p><a class="btn btn-primary" href="body-types.html?body=' + type + '">See looks for ' + esc(tname.toLowerCase()) + '</a></p>';

        var extras = [];
        if (height && height <= 160) extras.push('<a href="body-types.html?body=petite">Petite</a>');
        if (height && height >= 175) extras.push('<a href="body-types.html?body=tall">Tall</a>');
        if (!beyond && size.uk >= 18) extras.push('<a href="body-types.html?body=plus-size">Plus size</a>');
        if (extras.length) html += '<p class="result-note">Based on your height and size, you may also like our ' + extras.join(" and ") + ' looks.</p>';

        html += '<p class="result-fine">This is a guide, not a guarantee. Sizes differ between brands, so check the retailer’s own size chart before you buy.</p>';
        out.innerHTML = html;
        out.hidden = false;
        out.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
      });
    },

    /* ---------------- STYLIST ---------------- */
    stylist: function () {
      var CFG = D.config;
      var form = $("#book-form");
      var occ = $("#s-occasion"), body = $("#s-body");
      occ.insertAdjacentHTML("beforeend", D.occasions.map(function (o) { return '<option>' + esc(o.name) + '</option>'; }).join(""));
      body.insertAdjacentHTML("beforeend", D.bodyTypes.map(function (b) { return '<option>' + esc(b.name) + '</option>'; }).join(""));

      /* pre-fill from a look, or from the bag */
      var names = [];
      var one = params.get("look");
      if (one && U.byId(one)) names.push(U.byId(one).name);
      var many = params.get("looks");
      if (many) many.split(",").forEach(function (id) { var l = U.byId(decodeURIComponent(id)); if (l) names.push(l.name); });
      if (names.length) {
        form.notes.value = "I'd like help with: " + names.join("; ") + ".";
        $("#prefill-note").textContent = "We added the looks you picked. Change anything you like.";
        $("#prefill-note").hidden = false;
      }

      var connected = !!(CFG.whatsapp || CFG.email);
      if (!connected) $("#setup-note").hidden = false;

      var chat = $("#chat-link");
      var chatHref = U.whatsappLink("Hi Daya, I'd like some help finding an outfit.");
      if (chatHref) { chat.href = chatHref; chat.target = "_blank"; chat.rel = "noopener noreferrer"; }
      else { chat.hidden = true; $("#chat-fallback").hidden = false; }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var f = form;
        var lines = [
          "Hi Daya, I'd like to book a stylist.",
          "",
          "Name: " + f.elements["name"].value,
          "Dressing for: " + (f.occasion.value || "Not sure yet"),
          "Body type: " + (f.body.value || "Not sure yet"),
          "Budget: " + (f.budget.value || "Flexible"),
          "Needed by: " + (f.date.value || "No fixed date"),
          "Notes: " + (f.notes.value || "None"),
          "Contact: " + f.contact.value
        ];
        var text = lines.join("\n");
        var msg = $("#form-msg");
        if (CFG.whatsapp) {
          window.open(U.whatsappLink(text), "_blank", "noopener");
          msg.textContent = "Opening WhatsApp with your request. Press send there to finish.";
        } else if (CFG.email) {
          location.href = "mailto:" + CFG.email + "?subject=" + encodeURIComponent("Stylist request: " + (f.occasion.value || "outfit help")) + "&body=" + encodeURIComponent(text);
          msg.textContent = "Opening your email app with your request. Press send there to finish.";
        } else {
          msg.textContent = "Booking isn’t switched on yet. Please check back soon.";
        }
        msg.hidden = false;
      });
    }
  };

  var page = document.body.getAttribute("data-page");
  if (pages[page]) pages[page]();
})();
