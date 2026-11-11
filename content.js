/* Daya — shared layout: affirmation bar, header, left menu, saved-looks bag, footer.
   Runs on every page. Exposes window.DayaUI for the page scripts. */
(function () {
  var D = window.DAYA;
  var CFG = D.config;
  var BAG_KEY = "daya.bag";

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(amount, currency) {
    if (currency === "USD") return "$" + amount.toLocaleString("en-US");
    return "₦" + amount.toLocaleString("en-NG");
  }
  function byId(id) {
    for (var i = 0; i < D.looks.length; i++) if (D.looks[i].id === id) return D.looks[i];
    return null;
  }
  function occasionName(slug) {
    for (var i = 0; i < D.occasions.length; i++) if (D.occasions[i].slug === slug) return D.occasions[i].name;
    return slug;
  }
  function bodyName(slug) {
    for (var i = 0; i < D.bodyTypes.length; i++) if (D.bodyTypes[i].slug === slug) return D.bodyTypes[i].name;
    return slug;
  }
  function discount(look) {
    return look.was ? Math.round(((look.was - look.price) / look.was) * 100) : 0;
  }

  /* ---------- weekly affirmation ---------- */
  function currentAffirmation() {
    if (CFG.affirmationOverride && CFG.affirmationOverride.trim()) return CFG.affirmationOverride.trim();
    var list = CFG.affirmations || [];
    if (!list.length) return "";
    var start = new Date(CFG.affirmationStart + "T00:00:00");
    var weeks = Math.floor((Date.now() - start.getTime()) / (7 * 24 * 3600 * 1000));
    if (isNaN(weeks) || weeks < 0) weeks = 0;
    return list[weeks % list.length];
  }

  /* ---------- the bag (saved looks) ---------- */
  function readBag() {
    try {
      var raw = localStorage.getItem(BAG_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter(byId) : [];
    } catch (e) { return memoryBag; }
  }
  var memoryBag = [];
  function writeBag(arr) {
    memoryBag = arr;
    try { localStorage.setItem(BAG_KEY, JSON.stringify(arr)); } catch (e) { /* private mode: keep in memory */ }
    document.dispatchEvent(new CustomEvent("daya:bag"));
  }
  function isSaved(id) { return readBag().indexOf(id) !== -1; }
  function toggleSave(id) {
    var bag = readBag();
    var i = bag.indexOf(id);
    if (i === -1) bag.push(id); else bag.splice(i, 1);
    writeBag(bag);
    return i === -1;
  }

  /* ---------- icons ---------- */
  var ICON_BAG = '<svg class="icon icon-bag" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="bag-body" d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>';
  var ICON_MENU = '<svg class="icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h10M4 17h16"/></svg>';
  var ICON_CLOSE = '<svg class="icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  /* ---------- card (used by the page scripts) ---------- */
  function lookCard(look) {
    var saved = isSaved(look.id);
    var d = discount(look);
    var link = look.url
      ? '<a class="card-link" href="' + esc(look.url) + '" target="_blank" rel="noopener noreferrer">View at retailer</a>'
      : '<a class="card-link" href="stylist.html?look=' + encodeURIComponent(look.id) + '">Ask a stylist about this</a>';
    return (
      '<article class="card" data-look="' + esc(look.id) + '">' +
        '<div class="card-media">' +
          '<a class="card-img-link" href="look.html?id=' + encodeURIComponent(look.id) + '" aria-label="View ' + esc(look.name) + '"><img src="' + esc(look.image) + '" alt="' + esc(look.name) + '" loading="lazy" width="600" height="800"></a>' +
          (d ? '<span class="deal-badge">' + d + '% off</span>' : "") +
          '<button type="button" class="save' + (saved ? " is-saved" : "") + '" data-save="' + esc(look.id) + '" aria-pressed="' + saved + '" aria-label="' + (saved ? "Remove " : "Save ") + esc(look.name) + (saved ? " from your bag" : " to your bag") + '">' + ICON_BAG + '</button>' +
        '</div>' +
        '<div class="card-body">' +
          '<p class="card-meta">' + esc(occasionName(look.occasion)) + (look.brand ? " · " + esc(look.brand) : "") + '</p>' +
          '<h3 class="card-title"><a href="look.html?id=' + encodeURIComponent(look.id) + '">' + esc(look.name) + '</a></h3>' +
          '<p class="card-price"><span class="now">' + money(look.price, look.currency) + '</span>' +
            (look.was ? ' <s class="was"><span class="sr-only">was </span>' + money(look.was, look.currency) + '</s>' : "") + '</p>' +
        '</div>' +
      '</article>'
    );
  }

  /* ---------- build the chrome ---------- */
  var bodyLinks = D.bodyTypes.map(function (b) {
    return '<li><a href="looks.html?body=' + b.slug + '">' + esc(b.name) + '</a></li>';
  }).join("");
  var occLinks = D.occasions.map(function (o) {
    return '<li><a href="looks.html?occasion=' + o.slug + '">' + esc(o.name) + '</a></li>';
  }).join("");

  var headerHTML =
    '<a class="skip" href="#main">Skip to content</a>' +
    '<div class="affirm" role="note" aria-label="This week’s affirmation"><p>' + esc(currentAffirmation()) + '</p></div>' +
    '<header class="site-header">' +
      '<button type="button" class="menu-btn" id="menu-open" aria-controls="menu-drawer" aria-expanded="false">' + ICON_MENU + '<span>Browse</span></button>' +
      '<a class="logo" href="index.html" aria-label="Daya, home">Daya</a>' +
      '<div class="header-right">' +
        '<button type="button" class="bag-btn" id="bag-open" aria-controls="bag-drawer" aria-expanded="false" aria-label="Your saved looks">' + ICON_BAG + '<span class="bag-count" id="bag-count" hidden>0</span></button>' +
      '</div>' +
    '</header>' +
    '<div class="styling-strip"><a href="stylist.html#book">One-on-one personal styling and guidance <span aria-hidden="true">→</span></a></div>' +

    '<div class="scrim" id="scrim" hidden></div>' +

    '<aside class="drawer drawer-left" id="menu-drawer" aria-label="Browse Daya" aria-hidden="true">' +
      '<div class="drawer-head"><p class="drawer-title">Browse</p><button type="button" class="icon-btn" data-close aria-label="Close menu">' + ICON_CLOSE + '</button></div>' +
      '<nav class="drawer-body" aria-label="Browse">' +
        '<details class="acc"><summary>Body type</summary><ul class="acc-list">' + bodyLinks + '</ul></details>' +
        '<details class="acc"><summary>Occasion</summary><ul class="acc-list">' + occLinks + '</ul></details>' +
        '<a class="drawer-link" href="size-chart.html">Body size chart</a>' +
        '<a class="drawer-link" href="calculator.html">Body calculator</a>' +
        '<hr class="drawer-rule">' +
        '<a class="drawer-link sub" href="looks.html?collection=best">Best looks</a>' +
        '<a class="drawer-link sub" href="looks.html?collection=affordable">Most affordable</a>' +
        '<a class="drawer-link sub" href="looks.html?collection=deals">Best deals</a>' +
        '<a class="drawer-link sub" href="journal.html">Journal</a>' +
      '</nav>' +
    '</aside>' +

    '<aside class="drawer drawer-right" id="bag-drawer" aria-label="Your saved looks" aria-hidden="true">' +
      '<div class="drawer-head"><p class="drawer-title">Your bag</p><button type="button" class="icon-btn" data-close aria-label="Close your bag">' + ICON_CLOSE + '</button></div>' +
      '<div class="drawer-body" id="bag-list"></div>' +
      '<div class="drawer-foot" id="bag-foot" hidden><a class="btn btn-primary btn-block" id="bag-send" href="stylist.html">Send these to a stylist</a></div>' +
    '</aside>';

  var wa = CFG.whatsapp ? "https://wa.me/" + String(CFG.whatsapp).replace(/\D/g, "") + "?text=" + encodeURIComponent("Hi Daya, I'd like some help finding an outfit.") : "stylist.html#chat";
  var waAttrs = CFG.whatsapp ? ' target="_blank" rel="noopener noreferrer"' : "";

  var bandHTML =
    '<section class="stylist-band" aria-labelledby="band-title">' +
      '<div class="wrap band-inner">' +
        '<div><h2 id="band-title">Didn’t find what you were looking for?</h2>' +
        '<p>That’s okay. Tell us what you’re dressing for and a stylist will find options that fit you.</p></div>' +
        '<div class="band-actions">' +
          '<a class="btn btn-gold" href="' + wa + '"' + waAttrs + '>Chat with a stylist</a>' +
        '</div>' +
      '</div>' +
    '</section>';

  var showBand = document.body.getAttribute("data-page") === "looks";

  var footerHTML =
    (showBand ? bandHTML : "") +
    '<footer class="site-footer"><div class="wrap foot-inner">' +
      '<p class="foot-logo">Daya</p>' +
      '<p class="foot-tag">Womenswear. Style for your real life.</p>' +
      '<nav class="foot-nav" aria-label="Footer"><a href="looks.html">Looks</a><a href="journal.html">Journal</a><a href="size-chart.html">Size chart</a><a href="calculator.html">Body calculator</a><a href="stylist.html">Stylist</a></nav>' +
    '</div></footer>';

  document.body.insertAdjacentHTML("afterbegin", headerHTML);
  document.body.insertAdjacentHTML("beforeend", footerHTML);

  /* ---------- drawers ---------- */
  var scrim = document.getElementById("scrim");
  var drawers = {
    menu: { el: document.getElementById("menu-drawer"), btn: document.getElementById("menu-open") },
    bag: { el: document.getElementById("bag-drawer"), btn: document.getElementById("bag-open") }
  };
  var openKey = null;

  function openDrawer(key) {
    if (openKey) closeDrawer(true);
    var d = drawers[key];
    openKey = key;
    d.el.classList.add("open");
    d.el.setAttribute("aria-hidden", "false");
    d.btn.setAttribute("aria-expanded", "true");
    scrim.hidden = false;
    requestAnimationFrame(function () { scrim.classList.add("show"); });
    document.documentElement.classList.add("no-scroll");
    var first = d.el.querySelector("[data-close]");
    if (first) first.focus();
  }
  function closeDrawer(silent) {
    if (!openKey) return;
    var d = drawers[openKey];
    d.el.classList.remove("open");
    d.el.setAttribute("aria-hidden", "true");
    d.btn.setAttribute("aria-expanded", "false");
    if (!silent) d.btn.focus();
    openKey = null;
    scrim.classList.remove("show");
    document.documentElement.classList.remove("no-scroll");
    setTimeout(function () { if (!openKey) scrim.hidden = true; }, 250);
  }

  drawers.menu.btn.addEventListener("click", function () { openDrawer("menu"); });
  drawers.bag.btn.addEventListener("click", function () { renderBag(); openDrawer("bag"); });
  scrim.addEventListener("click", function () { closeDrawer(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDrawer();
    if (e.key === "Tab" && openKey) {                       /* keep focus inside the open drawer */
      var f = drawers[openKey].el.querySelectorAll("a[href], button, summary");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (b) {
    b.addEventListener("click", function () { closeDrawer(); });
  });
  /* following a link inside the menu closes it (matters for same-page links) */
  drawers.menu.el.addEventListener("click", function (e) {
    if (e.target.closest("a")) closeDrawer(true);
  });

  /* ---------- bag rendering ---------- */
  function renderBag() {
    var list = document.getElementById("bag-list");
    var foot = document.getElementById("bag-foot");
    var bag = readBag();
    if (!bag.length) {
      list.innerHTML =
        '<div class="bag-empty"><p class="bag-empty-title">Your bag is empty</p>' +
        '<p>Tap the bag icon on any look to save it here, then come back to compare or send them to a stylist.</p>' +
        '<a class="btn btn-primary" href="looks.html">Browse looks</a></div>';
      foot.hidden = true;
      return;
    }
    list.innerHTML = '<ul class="bag-items">' + bag.map(function (id) {
      var l = byId(id);
      var view = l.url
        ? '<a href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">View at retailer</a>'
        : '<a href="stylist.html?look=' + encodeURIComponent(l.id) + '">Ask a stylist</a>';
      return '<li class="bag-item">' +
        '<img src="' + esc(l.image) + '" alt="" width="72" height="96">' +
        '<div class="bag-item-text"><p class="bag-item-name">' + esc(l.name) + '</p>' +
        '<p class="bag-item-price">' + money(l.price, l.currency) + '</p>' +
        '<p class="bag-item-links">' + view + '<button type="button" class="linklike" data-remove="' + esc(l.id) + '">Remove</button></p></div>' +
        '</li>';
    }).join("") + '</ul>';
    foot.hidden = false;
    document.getElementById("bag-send").href = "stylist.html?looks=" + bag.map(encodeURIComponent).join(",") + "#book";
  }

  function refreshBadge() {
    var n = readBag().length;
    var c = document.getElementById("bag-count");
    c.textContent = n;
    c.hidden = n === 0;
    drawers.bag.btn.setAttribute("aria-label", n ? "Your saved looks, " + n + " saved" : "Your saved looks");
  }
  function refreshSaveButtons() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-save]"), function (b) {
      var id = b.getAttribute("data-save");
      var l = byId(id);
      var s = isSaved(id);
      b.classList.toggle("is-saved", s);
      b.setAttribute("aria-pressed", String(s));
      b.setAttribute("aria-label", (s ? "Remove " : "Save ") + (l ? l.name : "look") + (s ? " from your bag" : " to your bag"));
    });
  }

  document.addEventListener("click", function (e) {
    var save = e.target.closest("[data-save]");
    if (save) {
      var added = toggleSave(save.getAttribute("data-save"));
      if (added) {
        var btn = drawers.bag.btn;
        btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop");
      }
      return;
    }
    var rm = e.target.closest("[data-remove]");
    if (rm) { toggleSave(rm.getAttribute("data-remove")); renderBag(); }
  });
  document.addEventListener("daya:bag", function () { refreshBadge(); refreshSaveButtons(); });
  window.addEventListener("storage", function (e) { if (e.key === BAG_KEY) { refreshBadge(); refreshSaveButtons(); if (openKey === "bag") renderBag(); } });
  refreshBadge();

  /* ---------- public bits for the page scripts ---------- */
  window.DayaUI = {
    esc: esc, money: money, byId: byId, discount: discount,
    occasionName: occasionName, bodyName: bodyName,
    lookCard: lookCard, readBag: readBag,
    whatsappLink: function (text) {
      return CFG.whatsapp ? "https://wa.me/" + String(CFG.whatsapp).replace(/\D/g, "") + "?text=" + encodeURIComponent(text) : "";
    }
  };
})();
