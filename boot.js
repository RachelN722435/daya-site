/* Daya: loads the content saved in the admin before the site draws itself.
   If the content service is slow or unavailable, it falls back to the last copy
   this browser saw, and then to the starting content in content.js. */
(function () {
  var CACHE_KEY = "daya.content.v1";
  var WAIT_MS = 2500;

  function load(src, next) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = function () { if (next) next(); };
    s.onerror = function () { if (next) next(); };   /* never block the page */
    document.body.appendChild(s);
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (e) { return null; }
  }
  function writeCache(d) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch (e) { /* ignore */ }
  }

  function fetchSaved(done) {
    var finished = false;
    function finish(d) { if (!finished) { finished = true; clearTimeout(timer); done(d); } }
    var timer = setTimeout(function () { finish(readCache()); }, WAIT_MS);
    try {
      fetch("/api/site?a=content&v=" + Math.floor(Date.now() / 20000), { credentials: "same-origin" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (!j || j.error) return finish(readCache());       /* service trouble: use the last copy */
          if (j.data) writeCache(j.data);
          finish(j.data || null);
        })
        .catch(function () { finish(readCache()); });
    } catch (e) { finish(readCache()); }
  }

  function apply(D, saved) {
    if (saved && typeof saved === "object") {
      if (saved.config) D.config = Object.assign({}, D.config, saved.config);
      if (saved.text) D.text = Object.assign({}, D.text || {}, saved.text);
      ["bodyTypes", "occasions", "looks", "articles"].forEach(function (k) {
        if (!Array.isArray(saved[k])) return;
        if ((k === "bodyTypes" || k === "occasions") && !saved[k].length) return;
        D[k] = saved[k];
      });
    }
    D.text = D.text || {};
    D.looks = (D.looks || []).filter(function (l) { return l && l.visible !== false; })
      .map(function (l) { l.bodies = l.bodies || []; return l; });
    D.articles = (D.articles || []).filter(function (a) { return a && a.visible !== false; })
      .map(function (a) { a.body = a.body || []; return a; })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }

  load("content.js", function () {
    if (!window.DAYA) return;
    fetchSaved(function (saved) {
      apply(window.DAYA, saved);
      load("layout.js", function () { load("pages.js"); });
    });
  });
})();
