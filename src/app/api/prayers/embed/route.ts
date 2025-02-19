import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  try {
    console.log("API request received, attempting Google Sheets connection");
    
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS!),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    })

    const sheets = google.sheets({ version: 'v4', auth })
    
    console.log(`Fetching spreadsheet: ${process.env.SHEET_ID}`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1!A:B',
    })

    const rows = response.data.values || []
    console.log(`Received ${rows.length} rows from Google Sheets`);
    
    if (rows.length <= 1) {
      console.warn("Warning: Received only header row or empty response");
      return NextResponse.json([], {
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-store, max-age=0',
        },
      })
    }

    // Take just the last 50 prayers to avoid data size issues
    const prayers = rows.slice(1, 51).map(([timestamp, content]) => ({
      timestamp,
      content
    }))

    console.log(`Returning ${prayers.length} prayer items`);
    return NextResponse.json(prayers, {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error: unknown) {
    console.error('Failed to fetch prayers:', error);
    
    // Safely extract error message
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
      
    return NextResponse.json(
      { error: 'Failed to fetch prayers', details: errorMessage },
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
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  )
}