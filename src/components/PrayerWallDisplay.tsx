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
  const prayersPerPage = 7;
  
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

  useEffect(() => {
    const totalPages = Math.ceil(prayers.length / prayersPerPage) + 1;
    
    const timer = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages);
    }, 18000);

    return () => clearInterval(timer);
  }, [prayers.length]);

  if (isLoading && prayers.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Image
            src="/images/Saint-Helen-Submark-White.png"
            alt="Saint Helen Logo"
            width={500}
            height={84}
            className="w-[500px] h-auto mx-auto mb-12"
            priority
          />
          <div className="text-white text-4xl animate-pulse">
            Loading prayers...
          </div>
        </div>
      </div>
    );
  }

  const InstructionPage = () => (
    <div key="instruction-page" className="flex flex-col items-center justify-center h-full text-center px-12">
      <div className="bg-slate-800/70 border border-slate-700 rounded-2xl shadow-xl backdrop-blur-sm p-12 max-w-3xl">
        <h2 className="text-5xl font-bold text-white mb-12">Submit Your Prayer Intention</h2>
        <div className="space-y-8 text-2xl text-slate-100">
          <p className="mb-8 text-3xl">
            Use the iPad to submit your prayer intention
          </p>
          <p className="text-blue-400 text-3xl">
            - or -
          </p>
          <p className="text-3xl">
            Visit <span className="text-blue-400 font-semibold">prayerwall.sainthelen.org</span><br />
            on your mobile device
          </p>
          <div className="text-7xl mt-12">🙏</div>
        </div>
      </div>
    </div>
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
      <header className="text-center py-8 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="flex justify-center items-center gap-8 mb-6">
          <Image
            src="/images/Saint-Helen-Submark-White.png"
            alt="Saint Helen Logo"
            width={500}
            height={84}
            className="w-[500px] h-auto"
            priority
          />
          <Image
            src="/images/jubilee-logo.png"
            alt="Jubilee Logo"
            width={84}
            height={84}
            className="h-[84px] w-auto"
            priority
          />
        </div>
        <h1 className="text-6xl font-bold text-white">
          Jubilee Prayer Wall
        </h1>
      </header>

      <div 
        className="p-8 max-w-6xl mx-auto relative" 
        style={{ height: 'calc(100vh - 180px)' }}
      >
        {currentPage === Math.ceil(prayers.length / prayersPerPage) ? (
          <InstructionPage />
        ) : (
          <div className="space-y-7 transition-opacity duration-1000 ease-in-out">
            {prayers
              .slice(
                currentPage * prayersPerPage,
                (currentPage + 1) * prayersPerPage
              )
              .map((prayer, index) => (
                <div 
                  key={`${prayer.id}-${currentPage}`}
                  className="bg-slate-800/70 border border-slate-700 rounded-xl shadow-xl backdrop-blur-sm p-8 opacity-0 animate-fadeIn"
                  style={{
                    animationDelay: `${index * 200}ms`,
                    animationFillMode: 'forwards'
                  }}
                >
                  <div className="flex items-start gap-6">
                    <span className="text-4xl">🙏</span>
                    <div>
                      <p className="text-2xl text-slate-100 mb-4 leading-relaxed">
                        {prayer.content}
                      </p>
                      <p className="text-lg text-slate-400">
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
        )}
      </div>
    </div>
  );
}