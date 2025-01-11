import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_url,timestamp&access_token=${process.env.INSTAGRAM_TOKEN}`
    );
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Instagram posts' }, { status: 500 });
  }
}