'use client'
import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface Prayer {
  id: string;
  content: string;
  timestamp: string;
}

export default function PrayerWallDisplay() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const prayersPerPage = 6;
  
  // Fetch prayers
  useEffect(() => {
    const fetchPrayers = async () => {
      try {
        setIsLoading(true);
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
      } catch (err) {
        console.error('Error fetching prayers:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrayers();
    const interval = setInterval(fetchPrayers, 30000);
    return () => clearInterval(interval);
  }, []);

  // Page rotation
  useEffect(() => {
    const totalPages = Math.ceil(prayers.length / prayersPerPage);
    if (totalPages <= 1) return;

    const timer = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages);
    }, 10000); // Switch pages every 10 seconds

    return () => clearInterval(timer);
  }, [prayers.length]);

  if (isLoading && prayers.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Image
            src="/images/Saint-Helen-Submark-White.png"
            alt="Saint Helen Logo"
            width={400}
            height={67}
            className="h-20 w-auto mx-auto mb-8"
            priority
          />
          <div className="text-white text-2xl animate-pulse">
            Loading prayers...
          </div>
        </div>
      </div>
    );
  }

  const currentPrayers = prayers.slice(
    currentPage * prayersPerPage,
    (currentPage + 1) * prayersPerPage
  );

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
      <header className="text-center py-6 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <Image
          src="/images/Saint-Helen-Submark-White.png"
          alt="Saint Helen Logo"
          width={400}
          height={67}
          className="h-16 w-auto mx-auto mb-4"
          priority
        />
        <h1 className="text-4xl font-bold text-white">
          Community Prayer Wall
        </h1>
      </header>

      <div 
        className="p-6 max-w-4xl mx-auto relative" 
        style={{ height: 'calc(100vh - 144px)' }}
      >
        <div className="space-y-4 transition-opacity duration-1000 ease-in-out">
          {currentPrayers.map((prayer, index) => (
            <div 
              key={`${prayer.id}-${currentPage}`}
              className="bg-slate-800/70 border border-slate-700 rounded-lg shadow-xl backdrop-blur-sm p-6 opacity-0 animate-fadeIn"
              style={{
                animationDelay: `${index * 200}ms`,
                animationFillMode: 'forwards'
              }}
            >
              <div className="flex items-start gap-4">
                <span className="text-2xl">🙏</span>
                <div>
                  <p className="text-xl text-slate-100 mb-3 leading-relaxed">
                    {prayer.content}
                  </p>
                  <p className="text-sm text-slate-400">
                    {new Date(prayer.timestamp).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}