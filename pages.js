/* Daya — page scripts. Each page sets <body data-page="..."> and gets its own function. */
(function () {
  var D = window.DAYA;
  var U = window.DayaUI;
  var esc = U.esc;
  var params = new URLSearchParams(location.search);
  function $(s, r) { return (r || document).querySelector(s); }

  /* ---------- shared collections ---------- */
  function best() { return D.looks.filter(function (l) { return l.featured; }); }
  function affordable() {
    return D.looks.filter(function (l) { return l.currency === "NGN"; })
      .sort(function (a, b) { return a.price - b.price; });
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

  var pages = {

    /* ---------------- HOME ---------------- */
    home: function () {
      fillGrid("#grid-best", best(), 4);
      fillGrid("#grid-affordable", affordable(), 4);
      fillGrid("#grid-deals", deals(), 4);
      var j = $("#home-journal");
      if (j) j.innerHTML = D.articles.slice(0, 3).map(articleCard).join("");
    },

    /* ---------------- LOOKS (pick occasion, then body type) ---------------- */
    looks: function () {
      function valid(list, slug) {
        for (var i = 0; i < list.length; i++) if (list[i].slug === slug) return slug;
        return "";
      }
      var state = {
        occ: valid(D.occasions, params.get("occasion") || ""),
        body: valid(D.bodyTypes, params.get("body") || ""),
        col: params.get("collection") || ""
      };
      var TITLES = { best: "Best looks", affordable: "Most affordable", deals: "Best deals" };
      if (!TITLES[state.col]) state.col = "";

      var occWrap = $("#occ-chips"), bodyWrap = $("#body-chips");

      function chips(list, current) {
        return list.map(function (x) {
          return '<button type="button" class="chip" data-slug="' + x.slug + '" aria-pressed="' + (x.slug === current) + '">' + esc(x.name) + '</button>';
        }).join("");
      }

      function render() {
        occWrap.innerHTML = chips(D.occasions, state.occ);
        bodyWrap.innerHTML = chips(D.bodyTypes, state.body);
        $("#step-body").hidden = !(state.occ || state.body || state.col);

        var ready = (state.occ && state.body) || state.col;
        var prompt = "";
        if (!ready) {
          if (!state.occ && !state.body) prompt = "Start by choosing the occasion you’re dressing for.";
          else if (state.occ) prompt = "Now choose your body type to see your looks.";
          else prompt = "Now choose the occasion to see your looks.";
        }
        $("#looks-prompt").textContent = prompt;

        var title = TITLES[state.col] || "All looks";
        var bits = [];
        if (state.body) bits.push(U.bodyName(state.body));
        if (state.occ) bits.push(U.occasionName(state.occ));
        $("#looks-title").textContent = bits.length ? (state.col ? title + ": " : "") + bits.join(", ") : title;

        var desc = "";
        for (var i = 0; i < D.bodyTypes.length; i++) if (D.bodyTypes[i].slug === state.body) desc = D.bodyTypes[i].desc;
        $("#looks-desc").textContent = desc || "Outfits chosen for different bodies and moments. Save the ones you love to your bag.";

        var grid = $("#looks-grid"), count = $("#looks-count"), empty = $("#looks-empty");
        if (!ready) {
          grid.innerHTML = "";
          count.textContent = "";
          empty.hidden = true;
        } else {
          var list = D.looks.slice();
          if (state.col === "best") list = best();
          if (state.col === "affordable") list = affordable();
          if (state.col === "deals") list = deals();
          if (state.body) list = list.filter(function (l) { return l.bodies.indexOf(state.body) !== -1; });
          if (state.occ) list = list.filter(function (l) { return l.occasion === state.occ; });
          count.textContent = list.length + (list.length === 1 ? " look" : " looks");
          if (list.length) {
            grid.innerHTML = list.map(U.lookCard).join("");
            empty.hidden = true;
          } else {
            grid.innerHTML = "";
            empty.hidden = false;
          }
        }

        var q = new URLSearchParams();
        if (state.occ) q.set("occasion", state.occ);
        if (state.body) q.set("body", state.body);
        if (state.col) q.set("collection", state.col);
        var qs = q.toString();
        try { history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "")); } catch (e) { /* ignore */ }
      }

      function pick(key) {
        return function (e) {
          var b = e.target.closest(".chip");
          if (!b) return;
          var slug = b.getAttribute("data-slug");
          state[key] = state[key] === slug ? "" : slug;
          render();
        };
      }
      occWrap.addEventListener("click", pick("occ"));
      bodyWrap.addEventListener("click", pick("body"));
      $("#f-reset").addEventListener("click", function () { state.occ = ""; state.body = ""; state.col = ""; render(); });
      render();
    },

    /* ---------------- LOOK (single outfit) ---------------- */
    look: function () {
      var id = params.get("id");
      var l = U.byId(id);
      var box = $("#look");
      if (!l) {
        box.innerHTML = '<h1 class="page-title">We couldn’t find that look</h1><p class="lede">It may have moved. <a href="looks.html">Browse all looks</a>.</p>';
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
            '<p class="look-price"><span class="now">' + U.money(l.price, l.currency) + '</span>' +
              (l.was ? ' <s class="was">' + U.money(l.was, l.currency) + '</s>' : "") + '</p>' +
            (l.fabric ? '<p class="look-fact"><strong>Fabric</strong> ' + esc(l.fabric) + '</p>' : "") +
            (suits ? '<p class="look-fact"><strong>Suits</strong> ' + esc(suits) + '</p>' : "") +
            (l.styling ? '<h2 class="look-sub">How to style it</h2><p class="look-note">' + esc(l.styling) + '</p>' : "") +
            '<div class="look-actions">' + retailer +
              '<button type="button" class="btn btn-ghost" id="look-save" data-save="' + esc(l.id) + '"></button>' +
              '<button type="button" class="btn btn-ghost" id="look-share">Share this look</button></div>' +
            '<p class="look-copy"><button type="button" class="linklike" id="look-copy">Copy link</button></p>' +
            '<p class="back"><a href="looks.html">← All looks</a></p>' +
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

    /* ---------------- JOURNAL ---------------- */
    journal: function () {
      $("#journal-list").innerHTML = D.articles.map(articleCard).join("");
    },

    /* ---------------- ARTICLE ---------------- */
    article: function () {
      var id = params.get("id");
      var a = null;
      for (var i = 0; i < D.articles.length; i++) if (D.articles[i].id === id) a = D.articles[i];
      var box = $("#article");
      if (!a) {
        box.innerHTML = '<h1 class="page-title">We couldn’t find that article</h1><p class="lede">It may have moved. <a href="journal.html">Go back to the journal</a>.</p>';
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
        '<p class="back"><a href="journal.html">All articles</a></p>';
      box.innerHTML = html;
    },

    /* ---------------- SIZE CHART ---------------- */
    sizechart: function () {
      $("#body-guide").innerHTML = D.bodyTypes.map(function (b) {
        return '<div class="guide-item"><h3><a href="looks.html?body=' + b.slug + '">' + esc(b.name) + '</a></h3><p>' + esc(b.desc) + '</p></div>';
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
        html += '<p><a class="btn btn-primary" href="looks.html?body=' + type + '">See looks for ' + esc(tname.toLowerCase()) + '</a></p>';

        var extras = [];
        if (height && height <= 160) extras.push('<a href="looks.html?body=petite">Petite</a>');
        if (height && height >= 175) extras.push('<a href="looks.html?body=tall">Tall</a>');
        if (!beyond && size.uk >= 18) extras.push('<a href="looks.html?body=plus-size">Plus size</a>');
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
