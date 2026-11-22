import type { Config } from "tailwindcss";

/**
 * "Soft Club × Matrix" theme.
 * Every palette the app already uses is remapped here, so existing components pick up the new look:
 *   neutral → cool ink, emerald → phosphor mint, sky → ice blue, rose/pink → soft-club pink,
 *   amber → champagne, purple/fuchsia/indigo/violet → lilac.
 */
const ink = {
  50: "#f2f6fb", 100: "#e3eaf3", 200: "#c8d3e2", 300: "#a9b8cc", 400: "#8799b1", 500: "#6a7d96",
  600: "#4d5e76", 700: "#36445a", 800: "#212c3c", 850: "#1a2433", 900: "#111a26", 950: "#060a11",
};
const mint = {
  50: "#ecfff6", 100: "#d0ffe9", 200: "#a6ffd6", 300: "#7cffc4", 400: "#4df5a8", 500: "#22e08d",
  600: "#12b872", 700: "#0e8f5a", 800: "#0d6e47", 900: "#0a4f34", 950: "#052c1d",
};
const ice = {
  50: "#eef8ff", 100: "#d9efff", 200: "#bfe3ff", 300: "#a8d8ff", 400: "#7cc3ff", 500: "#52a8f5",
  600: "#3a8ad6", 700: "#2e6cab", 800: "#27548a", 900: "#1f3f68", 950: "#132741",
};
const softPink = {
  50: "#fff1f6", 100: "#ffe0ec", 200: "#ffc2da", 300: "#ff9fc4", 400: "#ff7aae", 500: "#f75597",
  600: "#dd3a7c", 700: "#b52c64", 800: "#8c2450", 900: "#631b3a", 950: "#3b0f22",
};
const champagne = {
  50: "#fffaeb", 100: "#fff1c7", 200: "#ffe69a", 300: "#ffd86b", 400: "#f9c74f", 500: "#e9ad2e",
  600: "#c98b1d", 700: "#a06a18", 800: "#7a5117", 900: "#553a12", 950: "#2f1f08",
};
const lilac = {
  50: "#f6f2ff", 100: "#ece4ff", 200: "#dccdff", 300: "#c9b8ff", 400: "#ad94ff", 500: "#9170f7",
  600: "#7756d9", 700: "#5f43b0", 800: "#4a3589", 900: "#352763", 950: "#1f173b",
};

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        neutral: ink,
        emerald: mint,
        sky: ice,
        rose: softPink,
        pink: softPink,
        amber: champagne,
        orange: champagne,
        purple: lilac,
        fuchsia: lilac,
        indigo: lilac,
        violet: lilac,
        mint,
        ice,
        lilac,
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "0% 50%" }, "100%": { backgroundPosition: "200% 50%" } },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        shimmer: "shimmer 6s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
