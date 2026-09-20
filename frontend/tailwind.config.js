/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "sans-serif"],
        heading: ["Outfit", "Plus Jakarta Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        emerald: {
          50: "#ECFDF5", 100: "#D1FAE5", 500: "#10B981",
          600: "#059669", 700: "#047857", 800: "#065F46", 900: "#064E3B",
        },
        gold: {
          50: "#FFFBEB", 100: "#FEF3C7", 400: "#FBBF24",
          500: "#F59E0B", 600: "#D97706", 700: "#B45309",
        },
        ink: "#0F172A",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(15,23,42,0.06), 0 8px 24px -12px rgba(15,23,42,0.12)",
      },
    },
  },
  plugins: [],
};
