(function () {
  var STORAGE_KEY = "blog-theme";
  var DEFAULT_THEME = "light";

  var THEMES = [
    { id: "light", label: "Light", group: "Neutral" },
    { id: "dark", label: "Dark", group: "Neutral" },
    { id: "warm-sunset", label: "Sunset", group: "Warm" },
    { id: "warm-honey", label: "Honey", group: "Warm" },
    { id: "warm-rose", label: "Rose", group: "Warm" },
    { id: "cool-ocean", label: "Ocean", group: "Cool" },
    { id: "cool-mint", label: "Mint", group: "Cool" },
    { id: "cool-lavender", label: "Lavender", group: "Cool" },
  ];

  function getSystemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function isValidTheme(theme) {
    return THEMES.some(function (t) {
      return t.id === theme;
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }

  function getStoredTheme() {
    return localStorage.getItem(STORAGE_KEY);
  }

  function initTheme() {
    var stored = getStoredTheme();
    var theme = stored && isValidTheme(stored) ? stored : getSystemTheme();
    applyTheme(theme);
    return theme;
  }

  function buildThemeSelect(currentTheme) {
    var select = document.getElementById("theme-select");
    if (!select) return;

    var groups = {};
    THEMES.forEach(function (theme) {
      if (!groups[theme.group]) {
        groups[theme.group] = document.createElement("optgroup");
        groups[theme.group].label = theme.group;
        select.appendChild(groups[theme.group]);
      }
      var option = document.createElement("option");
      option.value = theme.id;
      option.textContent = theme.label;
      groups[theme.group].appendChild(option);
    });

    select.value = isValidTheme(currentTheme) ? currentTheme : DEFAULT_THEME;
    select.addEventListener("change", function () {
      var next = select.value;
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
    });
  }

  var currentTheme = initTheme();

  document.addEventListener("DOMContentLoaded", function () {
    buildThemeSelect(currentTheme);
  });
})();
