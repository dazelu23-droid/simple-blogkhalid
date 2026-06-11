(function () {
  var STORAGE_KEY = "blog-theme";

  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  function getStoredTheme() {
    return localStorage.getItem(STORAGE_KEY);
  }

  function initTheme() {
    var theme = getStoredTheme() || getSystemTheme();
    applyTheme(theme);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme") || "light";
    var next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  initTheme();

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", toggleTheme);
    }
  });
})();
