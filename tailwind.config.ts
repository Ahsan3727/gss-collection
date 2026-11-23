import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B0B0B",
        "ink-2": "#585858",
        ground: "#F5F5F3",
        mist: "#EEEEEC",
        line: "#E2E2DF",
        border: "#6E6E6E",
        gold: "#B26B00",
        sapphire: "#0B0B0B",
        ice: "#D9D9D9",
        error: "#B3261E",
        ok: "#1B6B3A",
      },
      fontFamily: {
        display: ["'Cormorant Garamond'", "Georgia", "serif"],
        body: ["'Inter'", "system-ui", "-apple-system", "sans-serif"],
      },
      maxWidth: {
        site: "1320px",
      },
    },
  },
  plugins: [],
};
export default config;
