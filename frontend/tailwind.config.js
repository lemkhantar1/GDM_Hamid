/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Instrument Serif'", "ui-serif", "Georgia", "serif"],
        speech:  ["'Fraunces Variable'", "'Fraunces'", "ui-serif", "Georgia", "serif"],
        body:    ["'Inter Variable'", "'Inter'", "system-ui", "sans-serif"],
        mono:    ["ui-monospace", "'SF Mono'", "Menlo", "monospace"],
      },
      colors: {
        // Monochrome stage — near-black → bone white, with a single restrained accent.
        ink:    "#0a0a0c",
        shade:  "#111114",
        rule:   "#1f1f24",
        dim:    "#2a2a2f",
        bone:   "#f4f1e8",   // text primary
        muted:  "#9a9892",   // text dim
        faint:  "#5a5853",   // text faint
        accent: "#d9c98f",   // single warm accent, used sparingly

        // Cool / warm grayscale — barely-there tint to separate sides.
        pro: { 300: "#dcdfe2", 400: "#a8acb2", 500: "#6f7378", 600: "#41444a" },
        con: { 300: "#e4ded2", 400: "#b3ac9e", 500: "#7c7568", 600: "#4a4437" },
      },
      boxShadow: {
        edge:   "0 0 0 1px rgba(244,241,232,0.06)",
        glowPro:"0 0 60px -15px rgba(168,172,178,0.45)",
        glowCon:"0 0 60px -15px rgba(179,172,158,0.45)",
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        shimmer: "shimmer 11s linear infinite",
      },
    },
  },
  plugins: [],
};
