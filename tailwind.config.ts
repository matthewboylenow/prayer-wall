import type { Config } from "tailwindcss";

// Colour tokens mirror the Saint Helen ministries stylesheet on sainthelen.org
// so the prayer wall reads as part of the same family.
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1F346D',
          deep: '#16264F',
          light: '#2A4A8F',
        },
        rust: {
          DEFAULT: '#CD5334',
          solid: '#B5452B',
          dark: '#9C3A23',
        },
        gold: '#D4AF37',
        cream: '#F2EFE8',
        paper: '#FAF9F7',
        ink: '#1F2430',
        muted: '#5B6272',
        line: '#E5E1D8',
      },
      fontFamily: {
        heading: ['var(--font-libre-baskerville)', 'Libre Baskerville', 'Georgia', 'serif'],
        body: ['var(--font-libre-franklin)', 'Libre Franklin', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
