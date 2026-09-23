/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0E1E3A",
          light: "#16295099",
          soft: "#1B2C52",
        },
        coral: {
          DEFAULT: "#D9553C",
          light: "#F0916F",
          soft: "#F6E4DC",
        },
        gold: {
          DEFAULT: "#D9A441",
          light: "#F0CF8C",
          soft: "#FBF0DA",
        },
        leaf: {
          DEFAULT: "#2E6E52",
          light: "#5C9A7C",
          soft: "#E1EEE6",
        },
        cream: "#F6F2E9",
        ink: "#1C2440",
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px -12px rgba(14, 30, 58, 0.35)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-6px)" },
          "40%": { transform: "translateX(6px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
        "float-up": {
          "0%": { transform: "translateY(6px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.2)",
        "shake": "shake 0.4s ease-in-out",
        "float-up": "float-up 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
