import { google } from 'googleapis'
import { NextResponse } from 'next/server'

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS!),
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
})

export async function POST(request: Request) {
  const { prayer } = await request.json()
  
  const sheets = google.sheets({ version: 'v4', auth })
  
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1!A:B',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[new Date().toISOString(), prayer]]
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (err) { // Changed from 'error' to 'err' and using it
    console.error('Failed to submit prayer:', err)
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  }
}