import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-md)",
      },
      boxShadow: {
        panel: "var(--shadow-raised)",
        neo: "var(--shadow-raised)",
        "neo-soft": "var(--shadow-soft)",
        inset: "var(--shadow-inset)",
      },
      colors: {
        primary: "rgb(var(--color-primary-rgb) / <alpha-value>)",
        secondary: "rgb(var(--color-secondary-rgb) / <alpha-value>)",
        surface: "rgb(var(--color-surface-rgb) / <alpha-value>)",
        text: "rgb(var(--color-text-rgb) / <alpha-value>)",
        muted: "rgb(var(--color-muted-rgb) / <alpha-value>)",
        line: "rgb(var(--color-line-rgb) / <alpha-value>)",
        success: "rgb(var(--color-success-rgb) / <alpha-value>)",
        warning: "rgb(var(--color-warning-rgb) / <alpha-value>)",
        danger: "rgb(var(--color-danger-rgb) / <alpha-value>)",
        info: "rgb(var(--color-info-rgb) / <alpha-value>)",
        ink: "rgb(var(--color-text-rgb) / <alpha-value>)",
        page: "rgb(var(--color-surface-rgb) / <alpha-value>)",
      },
      fontFamily: {
        primary: ["var(--font-space-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-space-mono)", "ui-monospace", "monospace"],
        label: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
