import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': 'https://sainthelen.org',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function GET() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS!),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })

  try {
    const sheets = google.sheets({ version: 'v4', auth })
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1!A:B',
    })

    const rows = response.data.values || []
    const prayers = rows.slice(1).map(([timestamp, content]) => ({
      timestamp,
      content
    }))

    return NextResponse.json(prayers, {
      headers: {
        'Access-Control-Allow-Origin': 'https://sainthelen.org',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 's-maxage=30'
      }
    })
  } catch (error) {
    console.error('Failed to fetch prayers:', error);
    return NextResponse.json({ error: 'Failed to fetch prayers' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://sainthelen.org',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  }
}