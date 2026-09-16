// Strips the loading screen on any page load after the site's first load
// in this tab session (flag is set by app.js via sessionStorage).
(function () {
  'use strict';
  try {
    if (sessionStorage.getItem('crookflix-session-loaded')) {
      var strip = function () {
        var el = document.getElementById('loading');
        if (el) el.remove();
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', strip);
      } else {
        strip();
      }
    }
  } catch (e) {}
})();
