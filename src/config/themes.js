/**
 * Theme Configuration
 * Defines color palettes for different themes
 */

export const themes = [
  {
    value: "yrgo",
    label: "YRGO Mode",
    colors: {
      primary: "#001A52",
      secondary: "#FFB6D9",
      background: "#FFFFFF",
      text: "#001A52",
      textMuted: "#666666",
      accent: "#001A52",
      accentBg: "rgba(170, 59, 255, 0.1)",
      accentBorder: "rgba(170, 59, 255, 0.5)",
      buttonPrimaryBg: "#001A52",
      buttonPrimaryHover: "#003399",
      buttonSecondaryBg: "#FFB6D9",
      buttonSecondaryHover: "#FF9AC5",
    },
  },
  {
    value: "matrix",
    label: "Matrix Mode",
    colors: {
      primary: "#00FF41",
      secondary: "#00CC33",
      background: "#000000",
      text: "#00FF41",
      textMuted: "#00AA33",
      accent: "#00FF41",
      accentBg: "rgba(0, 255, 65, 0.1)",
      accentBorder: "rgba(0, 255, 65, 0.3)",
      buttonPrimaryBg: "#00AA33",
      buttonPrimaryHover: "#00FF41",
      buttonPrimaryText: "#000000",
      buttonPrimaryHoverText: "#000000",
      buttonSecondaryBg: "#006633",
      buttonSecondaryHover: "#00CC33",
      buttonSecondaryText: "#000000",
      buttonSecondaryHoverText: "#000000",
      inputText: "#000000",
      inputBg: "#00FF41",
    },
  },
];

/**
 * Get theme configuration by value
 * @param {string} themeValue - The theme value (e.g., "yrgo", "matrix")
 * @returns {Object} Theme configuration object
 */
export function getThemeConfig(themeValue) {
  const theme = themes.find((t) => t.value === themeValue);
  return theme || themes[0]; // Default to YRGO if not found
}

/**
 * Apply theme colors to CSS variables
 * @param {string} themeValue - The theme value
 */
export function applyTheme(themeValue) {
  const theme = getThemeConfig(themeValue);
  const colors = theme.colors;

  // Apply to root element
  const root = document.documentElement;
  root.style.setProperty("--color-primary", colors.primary);
  root.style.setProperty("--color-secondary", colors.secondary);
  root.style.setProperty("--color-background", colors.background);
  root.style.setProperty("--color-text", colors.text);
  root.style.setProperty("--color-text-muted", colors.textMuted);
  root.style.setProperty("--text", colors.text);
  root.style.setProperty("--text-h", colors.text);
  root.style.setProperty("--bg", colors.background);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-bg", colors.accentBg);
  root.style.setProperty("--accent-border", colors.accentBorder);
  root.style.setProperty("--btn-primary-bg", colors.buttonPrimaryBg);
  root.style.setProperty("--btn-primary-hover", colors.buttonPrimaryHover);
  root.style.setProperty("--btn-primary-text", colors.buttonPrimaryText || colors.text);
  root.style.setProperty("--btn-primary-hover-text", colors.buttonPrimaryHoverText || colors.text);
  root.style.setProperty("--btn-secondary-bg", colors.buttonSecondaryBg);
  root.style.setProperty("--btn-secondary-hover", colors.buttonSecondaryHover);
  root.style.setProperty("--btn-secondary-text", colors.buttonSecondaryText || colors.text);
  root.style.setProperty("--btn-secondary-hover-text", colors.buttonSecondaryHoverText || colors.text);
  root.style.setProperty("--input-text", colors.inputText || colors.text);
  root.style.setProperty("--input-bg", colors.inputBg || colors.background);

  // Apply background for Matrix
  if (themeValue === "matrix") {
    document.documentElement.style.backgroundColor = colors.background;
    document.body.style.backgroundColor = colors.background;
  } else {
    // Reset to default for YRGO
    document.documentElement.style.backgroundColor = "";
    document.body.style.backgroundColor = "";
  }

  // Store current theme
  localStorage.setItem("currentTheme", themeValue);
}

/**
 * Reset theme to default (YRGO)
 */
export function resetTheme() {
  applyTheme("yrgo");
}
