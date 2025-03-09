// scripts/migrate-prayers.js
require('dotenv').config({ path: '.env.local' })
const { google } = require('googleapis')
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

async function migratePrayers() {
  try {
    console.log('Starting migration...')
    
    // Initialize Google Sheets client
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    })
    
    const sheets = google.sheets({ version: 'v4', auth })
    
    // Fetch all prayers from Google Sheets
    console.log('Fetching prayers from Google Sheets...')
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Sheet1!A:B',
    })
    
    const rows = response.data.values || []
    console.log(`Found ${rows.length - 1} prayers`)
    
    // Skip header row if present and filter out rows with null content
    const prayers = rows.slice(1)
      .filter(row => row.length >= 2 && row[1] !== null && row[1] !== '')
      .map(([timestamp, content]) => ({
        content,
        created_at: timestamp
      }))
    
    console.log(`After filtering, proceeding with ${prayers.length} valid prayers`)
    
    // Insert prayers into Supabase in batches of 100
    console.log('Inserting prayers into Supabase...')
    const batchSize = 100
    for (let i = 0; i < prayers.length; i += batchSize) {
      const batch = prayers.slice(i, i + batchSize)
      console.log(`Migrating batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(prayers.length/batchSize)}`)
      
      const { error } = await supabase
        .from('prayers')
        .insert(batch)
        
      if (error) {
        console.error('Error inserting batch:', error)
        throw error
      }
    }
    
    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

migratePrayers()