/*!
 * Luke Baber — site review loader.
 * Paste on client sites:  <script async src="https://www.lukebaber.com/review/loader.js"></script>
 *
 * Does nothing for normal visitors. When a client opens the site from their portal, the URL carries
 * #lb_review=<token>; this keeps the token for the tab (so page-to-page navigation stays in review
 * mode), removes it from the address bar, and loads the comment toolbar from the same origin as
 * this script. Admin docs: /admin/settings → "Site review toolbar".
 */
(function () {
  var KEY = "lb_review";
  var script = document.currentScript;
  if (!script || !script.src) return;
  var origin = new URL(script.src).origin;
  var token = null;

  var match = location.hash.match(/[#&]lb_review=([\w.-]+)/);
  if (match) {
    token = match[1];
    try {
      sessionStorage.setItem(KEY, token);
    } catch (e) {
      /* storage blocked: review works on this page only */
    }
    var focus = location.hash.match(/[#&]lb_focus=([\w-]+)/);
    if (focus) {
      try {
        sessionStorage.setItem("lb_review_focus", focus[1]);
      } catch (e) {
        /* ignore */
      }
    }
    var hash = location.hash.replace(/[#&]lb_(review|focus)=[\w.-]+/g, "").replace(/^&/, "#");
    history.replaceState(history.state, "", location.pathname + location.search + (hash === "#" ? "" : hash));
  } else {
    try {
      token = sessionStorage.getItem(KEY);
    } catch (e) {
      token = null;
    }
  }
  if (!token) return;

  window.__lbReview = { token: token, origin: origin, storageKey: KEY };
  var s = document.createElement("script");
  s.src = origin + "/review/toolbar.js";
  s.async = true;
  document.head.appendChild(s);
})();
