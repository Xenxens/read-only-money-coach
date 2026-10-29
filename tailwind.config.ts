import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#16231f",
          soft: "#263a33",
        },
        pine: {
          DEFAULT: "#1d4638",
          deep: "#123127",
          light: "#2e624f",
          soft: "#55766a",
        },
        cream: {
          DEFAULT: "#f7f2e7",
          deep: "#eee5d3",
        },
        mint: {
          DEFAULT: "#dff3e6",
          strong: "#b8e6c8",
        },
        coral: {
          DEFAULT: "#e56f51",
          soft: "#f8ddd5",
        },
        gold: {
          DEFAULT: "#bd8a2f",
          soft: "#f5e9c9",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(22, 35, 31, 0.04), 0 14px 40px rgba(22, 35, 31, 0.07)",
        lift: "0 2px 3px rgba(22, 35, 31, 0.05), 0 20px 55px rgba(22, 35, 31, 0.12)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "soft-pulse": {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 350ms ease-out both",
        "soft-pulse": "soft-pulse 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
