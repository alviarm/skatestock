// tailwind.config.js
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Courier New"',
          "Courier",
          "monospace",
          ...defaultTheme.fontFamily.sans,
        ],
      },
      // Add this to control form element colors
      colors: {
        foreground: "rgb(var(--foreground-rgb))",
        background: "rgb(var(--background-rgb))",
        surface: "rgb(var(--surface-rgb))",
      },
    },
  },
  plugins: [],
};
