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

// Configuration for display strategy
const DISPLAY_CONFIG = {
  prayersPerPage: 7,
  pageDisplayTime: 18000, // 18 seconds
  recentDays: 7, // Consider prayers from last 7 days as "recent"
  recentWeight: 0.7, // 70% of time show recent prayers
  instructionPageFrequency: 10, // Show instruction page every 10 pages
};

export default function PrayerWallDisplay() {
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [displayStrategy, setDisplayStrategy] = useState<'recent' | 'older' | 'instruction'>('recent');
  const [pageCount, setPageCount] = useState(0);
  
  // Separate prayers into recent and older
  const separatePrayers = (prayers: Prayer[]) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DISPLAY_CONFIG.recentDays);
    
    const recent: Prayer[] = [];
    const older: Prayer[] = [];
    
    prayers.forEach(prayer => {
      if (new Date(prayer.created_at) > cutoffDate) {
        recent.push(prayer);
      } else {
        older.push(prayer);
      }
    });
    
    return { recent, older };
  };

  const { recent, older } = separatePrayers(prayers);
  
  useEffect(() => {
    const fetchPrayers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/prayers');
        
        if (!response.ok) {
          console.error('Failed to fetch prayers');
          return;
        }
        
        const data: PrayersResponse = await response.json();
        setPrayers(data.prayers);
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

  // Smart page rotation logic
  useEffect(() => {
    const timer = setInterval(() => {
      setPageCount(prev => prev + 1);
      
      // Show instruction page every N pages
      if (pageCount > 0 && pageCount % DISPLAY_CONFIG.instructionPageFrequency === 0) {
        setDisplayStrategy('instruction');
        setCurrentPage(0);
        return;
      }
      
      // Determine whether to show recent or older prayers
      const showRecent = Math.random() < DISPLAY_CONFIG.recentWeight;
      const prayersToShow = showRecent ? recent : older;
      
      if (prayersToShow.length === 0) {
        // If no prayers in selected category, switch to the other
        const fallbackPrayers = showRecent ? older : recent;
        setDisplayStrategy(showRecent ? 'older' : 'recent');
        setCurrentPage(0);
      } else {
        setDisplayStrategy(showRecent ? 'recent' : 'older');
        const maxPages = Math.ceil(prayersToShow.length / DISPLAY_CONFIG.prayersPerPage);
        setCurrentPage(prev => {
          // For recent prayers, cycle through all pages
          if (showRecent) {
            return (prev + 1) % maxPages;
          }
          // For older prayers, show random pages to ensure variety
          return Math.floor(Math.random() * maxPages);
        });
      }
    }, DISPLAY_CONFIG.pageDisplayTime);

    return () => clearInterval(timer);
  }, [recent.length, older.length, pageCount]);

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
        
        {/* Show stats */}
        <div className="mt-8 pt-8 border-t border-slate-600">
          <p className="text-slate-300 text-xl">
            {prayers.length} prayers shared • {recent.length} this week
          </p>
        </div>
      </div>
    </div>
  );

  // Get prayers to display based on current strategy
  const getPrayersToDisplay = () => {
    if (displayStrategy === 'instruction') return [];
    
    const prayersToShow = displayStrategy === 'recent' ? recent : older;
    const startIndex = currentPage * DISPLAY_CONFIG.prayersPerPage;
    const endIndex = startIndex + DISPLAY_CONFIG.prayersPerPage;
    
    return prayersToShow.slice(startIndex, endIndex);
  };

  const displayedPrayers = getPrayersToDisplay();

  // Helper function to get relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}mo ago`;
    return `${Math.floor(diffInDays / 365)}y ago`;
  };

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
        <div className="flex items-center justify-center gap-4">
          <h1 className="text-6xl font-bold text-white">
            Jubilee Prayer Wall
          </h1>
          {displayStrategy !== 'instruction' && (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${displayStrategy === 'recent' ? 'bg-green-400' : 'bg-blue-400'}`}></div>
              <span className="text-slate-300 text-xl">
                {displayStrategy === 'recent' ? 'Recent' : 'Archive'}
              </span>
            </div>
          )}
        </div>
      </header>

      <div 
        className="p-8 max-w-6xl mx-auto relative" 
        style={{ height: 'calc(100vh - 180px)' }}
      >
        {displayStrategy === 'instruction' ? (
          <InstructionPage />
        ) : (
          <div className="space-y-7 transition-opacity duration-1000 ease-in-out">
            {displayedPrayers.map((prayer, index) => (
              <div 
                key={`${prayer.id}-${currentPage}-${displayStrategy}`}
                className="bg-slate-800/70 border border-slate-700 rounded-xl shadow-xl backdrop-blur-sm p-8 opacity-0 animate-fadeIn"
                style={{
                  animationDelay: `${index * 200}ms`,
                  animationFillMode: 'forwards'
                }}
              >
                <div className="flex items-start gap-6">
                  <span className="text-4xl">🙏</span>
                  <div className="flex-1">
                    <p className="text-xl text-slate-100 mb-4 leading-relaxed">
                      {prayer.content}
                    </p>
                    <div className="flex justify-between items-center">
                      <p className="text-lg text-slate-400">
                        {new Date(prayer.created_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                      <span className={`text-sm px-3 py-1 rounded-full ${
                        displayStrategy === 'recent' 
                          ? 'bg-green-400/20 text-green-400' 
                          : 'bg-blue-400/20 text-blue-400'
                      }`}>
                        {getRelativeTime(prayer.created_at)}
                      </span>
                    </div>
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