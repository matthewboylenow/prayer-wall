import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { prayer } = await request.json()
    
    // First, save to Google Sheets (keeping existing functionality)
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS!),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    })
    
    const sheets = google.sheets({ version: 'v4', auth })
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1!A:B',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[new Date().toISOString(), prayer]]
      }
    })
    
    // Also save to Supabase
    const { error } = await supabase
      .from('prayers')
      .insert([{ content: prayer, created_at: new Date().toISOString() }])
      
    if (error) throw error
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting prayer:', error)
    return NextResponse.json({ error: 'Failed to submit prayer' }, { status: 500 })
  }
}