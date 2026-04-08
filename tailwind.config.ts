import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          DEFAULT: '#1F346D',
          dark: '#0F1A38',
          light: '#2A4490',
        },
        rust: {
          DEFAULT: '#CD5334',
          light: '#D97355',
        },
        cream: {
          DEFAULT: '#FAF9F7',
          dark: '#EDE9E3',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#E5C75E',
        },
      },
      fontFamily: {
        heading: ['var(--font-libre-baskerville)', 'Libre Baskerville', 'serif'],
        body: ['var(--font-libre-franklin)', 'Libre Franklin', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
