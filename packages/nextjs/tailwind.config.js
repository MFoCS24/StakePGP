/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./utils/**/*.{js,ts,jsx,tsx}"],
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("daisyui")],
  darkTheme: "dark",
  darkMode: ["selector", "[data-theme='dark']"],
  // DaisyUI theme colors
  daisyui: {
    themes: [
      {
        light: {
          primary: "#ffc703",
          "primary-content": "#212638",
          secondary: "#383838",
          "secondary-content": "#ffffff",
          accent: "#ffc703",
          "accent-content": "#212638",
          neutral: "#383838",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#f8f8f8",
          "base-300": "#383838",
          "base-content": "#383838",
          info: "#ffc703",
          success: "#34EEB6",
          warning: "#FFCF72",
          error: "#FF8863",

          "--rounded-btn": "9999rem",

          ".tooltip": {
            "--tooltip-tail": "6px",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
        },
      },
      {
        dark: {
          primary: "#ffc703",
          "primary-content": "#F9FBFF",
          secondary: "#383838",
          "secondary-content": "#F9FBFF",
          accent: "#ffc703",
          "accent-content": "#F9FBFF",
          neutral: "#383838",
          "neutral-content": "#ffffff",
          "base-100": "#383838",
          "base-200": "#2a2a2a",
          "base-300": "#1a1a1a",
          "base-content": "#F9FBFF",
          info: "#ffc703",
          success: "#34EEB6",
          warning: "#FFCF72",
          error: "#FF8863",

          "--rounded-btn": "9999rem",

          ".tooltip": {
            "--tooltip-tail": "6px",
            "--tooltip-color": "oklch(var(--p))",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
        },
      },
    ],
  },
  theme: {
    extend: {
      boxShadow: {
        center: "0 0 12px -2px rgb(0 0 0 / 0.05)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
};
