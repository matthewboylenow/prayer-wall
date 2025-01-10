import type { Metadata } from 'next'
import './globals.css'

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
    <html lang="en">
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