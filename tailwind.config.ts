import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "#E5DEFF",
        input: "#F1F0FB",
        ring: "#D3E4FD",
        background: "#FFFFFF",
        foreground: "#403E43",
        primary: {
          DEFAULT: "#6366F1",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#818CF8",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#FF8B8B",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F1F0FB",
          foreground: "#6B7280",
        },
        accent: {
          DEFAULT: "#818CF8",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#F8F9FF",
          foreground: "#403E43",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fadeIn: "fadeIn 0.5s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;