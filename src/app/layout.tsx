import type { Metadata } from 'next'
import { Libre_Baskerville, Libre_Franklin } from 'next/font/google'
import './globals.css'

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-libre-baskerville',
  display: 'swap',
})

const libreFranklin = Libre_Franklin({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-libre-franklin',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Saint Helen Prayer Wall: Submit Prayer',
  description: 'Share your prayer intentions with our community',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${libreBaskerville.variable} ${libreFranklin.variable}`}>
      <head>
        <link
          rel="icon"
          href="https://sainthelen.org/wp-content/uploads/2019/10/cropped-512-px-JPG-Square-St-Helens-Logo-No-Text.jpg"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}