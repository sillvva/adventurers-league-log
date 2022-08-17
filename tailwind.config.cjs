/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        draconis: ["Draconis"],
        vecna: ["Vecna"]
      }
    }
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        dark: {
          ...require("daisyui/src/colors/themes")["[data-theme=dark]"],
          secondary: "#c881ff",
        },
        light: {
          ...require("daisyui/src/colors/themes")["[data-theme=light]"],
          secondary: "#570DF8",
        }
      }
    ]
  }
};
