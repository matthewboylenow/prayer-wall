import { google } from 'googleapis'
import { NextResponse } from 'next/server'

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS!),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
})

export async function GET() {
  const sheets = google.sheets({ version: 'v4', auth })

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1!A:B',
    })

    const rows = response.data.values || []

    // Generate RSS feed
    let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Saint Helen Prayer Wall</title>
    <link>https://your-app-url.vercel.app</link>
    <description>Prayer intentions from our community</description>`

    // Skip header row if exists
    for (let i = 1; i < rows.length; i++) {
      const [timestamp, prayer] = rows[i]
      rss += `
    <item>
      <title>Prayer Intention</title>
      <description>${prayer.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</description>
      <pubDate>${new Date(timestamp).toUTCString()}</pubDate>
      <guid>${timestamp}</guid>
    </item>`
    }

    rss += `
  </channel>
</rss>`

    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/rss+xml',
        'Cache-Control': 's-maxage=60, stale-while-revalidate'
      }
    })
  } catch (err) {
    console.error('Failed to generate RSS:', err)
    return NextResponse.json({ error: 'Failed to generate RSS' }, { status: 500 })
  }
}