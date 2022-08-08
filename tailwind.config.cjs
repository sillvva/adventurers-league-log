/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      backgroundColor: {
        base: "var(--color-bg-primary)"
      },
      textColor: {
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)"
      },
      fontFamily: {
        draconis: ["Draconis"],
        vecna: ["Vecna"]
      }
    }
  },
  plugins: [require("daisyui")]
};
