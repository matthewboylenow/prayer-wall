import React, { useState, useEffect } from 'react';

interface Prayer {
  id: string;
  content: string;
  timestamp: string;
}

interface InstagramPost {
  id: string;
  caption: string;
  mediaUrl: string;
  timestamp: string;
}

export default function PrayerWallDisplay() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);
  const [showingPrayers, setShowingPrayers] = useState(true);
  
  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Fetch prayers
        const rssResponse = await fetch('/api/rss');
        const rssData = await rssResponse.text();
        const parser = new DOMParser();
        const rssDoc = parser.parseFromString(rssData, 'text/xml');
        const items = rssDoc.querySelectorAll('item');
        
        const prayerItems = Array.from(items).map((item): Prayer => ({
          id: item.querySelector('guid')?.textContent || Math.random().toString(),
          content: item.querySelector('description')?.textContent || '',
          timestamp: item.querySelector('pubDate')?.textContent || ''
        }));
        
        setPrayers(prayerItems);

        // Fetch Instagram posts
        const instaResponse = await fetch('/api/instagram');
        const instaData = await instaResponse.json();
        setInstagramPosts(instaData);
      } catch (error) {
        console.error('Error fetching content:', error);
      }
    };

    fetchContent();
    const interval = setInterval(fetchContent, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Toggle between prayers and Instagram posts
  useEffect(() => {
    const timer = setInterval(() => {
      setShowingPrayers(prev => !prev);
    }, 45000); // Switch every 45 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      className="min-h-screen bg-slate-900 overflow-hidden"
      style={{
        height: '100vh',
        width: '100vw',
        transform: 'translate3d(0, 0, 0)',
        WebkitFontSmoothing: 'antialiased'
      }}
    >
      <header className="text-center py-8 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <img
          src="https://sainthelen.org/wp-content/uploads/2025/01/Saint-Helen-Logo-Submark-Vector-Black.png"
          alt="Saint Helen Logo"
          className="h-20 w-auto mx-auto mb-6 invert"
        />
        <h1 className="text-5xl font-bold text-white mb-2">
          {showingPrayers ? 'Community Prayer Wall' : 'Jubilee Celebrations'}
        </h1>
      </header>

      <div 
        className={`transition-all duration-1000 ease-in-out absolute w-full ${
          showingPrayers 
            ? 'translate-x-0 opacity-100' 
            : 'translate-x-full opacity-0'
        }`}
        style={{ willChange: 'transform, opacity' }}
      >
        {showingPrayers && (
          <div className="p-8 max-w-4xl mx-auto space-y-6">
            {prayers.slice(0, 4).map((prayer) => (
              <div 
                key={prayer.id} 
                className="bg-slate-800/70 border border-slate-700 rounded-lg shadow-xl transform-gpu backdrop-blur-sm p-8"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">🙏</span>
                  <div>
                    <p className="text-2xl text-slate-100 mb-4 leading-relaxed">
                      {prayer.content}
                    </p>
                    <p className="text-lg text-slate-400">
                      {new Date(prayer.timestamp).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div 
        className={`transition-all duration-1000 ease-in-out absolute w-full ${
          !showingPrayers 
            ? 'translate-x-0 opacity-100' 
            : '-translate-x-full opacity-0'
        }`}
        style={{ willChange: 'transform, opacity' }}
      >
        {!showingPrayers && (
          <div className="p-8 max-w-4xl mx-auto space-y-8">
            {instagramPosts.slice(0, 2).map((post) => (
              <div 
                key={post.id} 
                className="bg-slate-800/70 border border-slate-700 rounded-lg shadow-xl transform-gpu backdrop-blur-sm p-8"
              >
                <img 
                  src={post.mediaUrl} 
                  alt="Jubilee Celebration"
                  className="w-full h-64 object-cover rounded-lg mb-6"
                  loading="eager"
                />
                <p className="text-2xl text-slate-100 mb-4 leading-relaxed">
                  {post.caption}
                </p>
                <p className="text-xl text-blue-400">
                  #SaintHelenJubilee
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}