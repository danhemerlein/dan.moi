(function () {
  var stored = null;
  try { stored = localStorage.getItem('theme'); } catch (e) {}
  var theme = stored === 'light' || stored === 'dark' ? stored : 'light';
  document.documentElement.setAttribute('data-theme', theme);
})();
