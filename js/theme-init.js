(function () {
  // Dark mode is opt-in only (TH-02, deliberate product decision): a
  // first-time visitor always sees light mode's full-color pastel
  // branding, regardless of prefers-color-scheme. Dark/desaturated mode
  // is only reached by an explicit toggle (theme-toggle.js), which is
  // what makes it into localStorage here.
  var stored = null;
  try { stored = localStorage.getItem('theme'); } catch (e) {}
  var theme = stored === 'light' || stored === 'dark' ? stored : 'light';
  document.documentElement.setAttribute('data-theme', theme);
})();
