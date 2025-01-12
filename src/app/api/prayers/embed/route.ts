import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // For testing. Change to https://sainthelen.org in production
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS!),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    })

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
        ...corsHeaders,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('Failed to fetch prayers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prayers' },
      { 
        status: 500,
        headers: corsHeaders
      }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': '*', // Change to https://sainthelen.org in production
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  )
}