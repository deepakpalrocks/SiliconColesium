/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          900: "#0a0a0f",
          800: "#12121a",
          700: "#1a1a26",
          600: "#242433",
        },
        accent: {
          green: "#00ff88",
          red: "#ff4466",
          blue: "#4488ff",
          purple: "#8844ff",
          yellow: "#ffcc00",
        },
      },
    },
  },
  plugins: [],
};
