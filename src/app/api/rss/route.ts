import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log("RSS endpoint called");
    
    // Verify credentials exist
    if (!process.env.GOOGLE_CREDENTIALS) {
      console.error("Missing GOOGLE_CREDENTIALS environment variable");
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Verify sheet ID exists
    if (!process.env.SHEET_ID) {
      console.error("Missing SHEET_ID environment variable");
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    
    // Parse credentials safely
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    } catch (err) {
      console.error("Failed to parse GOOGLE_CREDENTIALS JSON:", err);
      return NextResponse.json(
        { error: 'Invalid credentials format' },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    console.log("Connecting to Google Sheets...");
    const sheets = google.sheets({ version: 'v4', auth });
    
    console.log(`Fetching spreadsheet: ${process.env.SHEET_ID}`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1!A:B',
    });

    const rows = response.data.values || [];
    console.log(`Received ${rows.length} rows from Google Sheets`);

    // Generate RSS XML
    let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Saint Helen Prayer Wall</title>
    <link>https://prayer-wall.vercel.app</link>
    <description>Prayer intentions from our community</description>`;

    // Skip header row if exists
    for (let i = 1; i < Math.min(rows.length, 51); i++) {
      const [timestamp, prayer] = rows[i];
      // Safely encode content for XML
      const safeContent = prayer
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
        
      rss += `
    <item>
      <title>Prayer Intention</title>
      <description>${safeContent}</description>
      <pubDate>${new Date(timestamp).toUTCString()}</pubDate>
      <guid>${timestamp}</guid>
    </item>`;
    }

    rss += `
  </channel>
</rss>`;

    console.log("Successfully generated RSS feed");
    return new NextResponse(rss, {
      headers: {
        'Content-Type': 'application/rss+xml',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: unknown) {
    // Log the full error for debugging
    console.error("RSS generation error:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unknown error occurred';
      
    console.error("Error details:", errorMessage);
    
    return NextResponse.json(
      { error: 'Failed to generate RSS feed', details: errorMessage },
      { status: 500 }
    );
  }
}