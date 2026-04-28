import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 12px 32px rgba(15, 23, 42, 0.08)",
      },
      colors: {
        ink: "#13202f",
        line: "#d9e2ec",
        page: "#f5f7fb",
      },
    },
  },
  plugins: [],
};

export default config;

