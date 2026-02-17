/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{html,js,jsx,ts,tsx}",
    "./renderer/**/*.{html,js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', '"Sora"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Sora"', '"Segoe UI"', "ui-sans-serif", "system-ui", "sans-serif"]
      },
      colors: {
        shell: {
          900: "#05070b",
          850: "#090d14",
          800: "#101622",
          700: "#161f31",
          600: "#24314b",
          line: "rgba(188, 213, 248, 0.2)"
        },
        accent: {
          300: "#9cc8ff",
          400: "#6fb0ff",
          500: "#3d94ff",
          600: "#2f72ff"
        }
      },
      boxShadow: {
        shell: "0 18px 42px rgba(1, 5, 11, 0.48)",
        soft: "0 12px 30px rgba(3, 8, 16, 0.38)",
        glow: "0 0 0 1px rgba(170, 209, 255, 0.32), 0 0 34px rgba(85, 152, 255, 0.2)"
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "0.54", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.06)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" }
        },
        spinSlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        }
      },
      animation: {
        "pulse-glow": "pulseGlow 1.4s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        "spin-slow": "spinSlow 1.1s linear infinite"
      }
    }
  },
  plugins: []
};
