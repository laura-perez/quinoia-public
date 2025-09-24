/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,ts,jsx,tsx}", "./src/components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "#EAEAEA",
        input: "#EAEAEA",
        ring: "#F4C95D",
        background: "#FFFDF8",
        foreground: "#414535",
        primary: {
          DEFAULT: "#F4C95D",
          foreground: "#414535",
        },
        secondary: {
          DEFAULT: "#FFF6DC",
          foreground: "#414535",
        },
        muted: {
          DEFAULT: "#8A8A8A",
          foreground: "#8A8A8A",
        },
        accent: {
          DEFAULT: "#FFF6DC",
          foreground: "#414535",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        card: {
          DEFAULT: "#FFFDF8",
          foreground: "#414535",
        },
        popover: {
          DEFAULT: "#FFFDF8",
          foreground: "#414535",
        },
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      boxShadow: {
        'quinoia': '0 4px 20px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};
