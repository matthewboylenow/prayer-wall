'use client'
import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface Prayer {
  id: string;
  content: string;
  created_at: string;
}

interface PrayersResponse {
  prayers: Prayer[];
  total: number;
  page: number;
  limit: number;
}

export default function PrayerWallDisplay() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const prayersPerPage = 7;
  
  useEffect(() => {
    const fetchPrayers = async () => {
      try {
        setIsLoading(true);
        // Fetch all prayers without limit
        const response = await fetch('/api/prayers');
        
        if (!response.ok) {
          console.error('Failed to fetch prayers');
          return;
        }
        
        const data: PrayersResponse = await response.json();
        setPrayers(data.prayers);
        setTotalPages(Math.ceil(data.total / prayersPerPage) + 1); // +1 for instruction page
      } catch (err) {
        console.error('Error fetching prayers:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrayers();
    const interval = setInterval(fetchPrayers, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Page rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPage(prev => (prev + 1) % totalPages);
    }, 18000); // 18 seconds per page

    return () => clearInterval(timer);
  }, [totalPages]);

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
            Use the iPad in the church to submit your prayer intention
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

  // Calculate displayed prayers for current page
  const getDisplayedPrayers = () => {
    // If instruction page
    if (currentPage === Math.ceil(prayers.length / prayersPerPage)) {
      return [];
    }
    
    // Regular prayer page
    return prayers.slice(
      currentPage * prayersPerPage,
      (currentPage + 1) * prayersPerPage
    );
  };

  const displayedPrayers = getDisplayedPrayers();

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
            src="/images/Jubilee-Logo.png"
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
            {displayedPrayers.map((prayer, index) => (
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
                    <p className="text-xl text-slate-100 mb-4 leading-relaxed">
                      {prayer.content}
                    </p>
                    <p className="text-lg text-slate-400">
                      {new Date(prayer.created_at).toLocaleDateString('en-US', {
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