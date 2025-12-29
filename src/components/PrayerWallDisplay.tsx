'use client'
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import CandleIcon from './CandleIcon';

interface Prayer {
  id: string;
  content: string;
  created_at: string;
  season?: string;
}

interface PrayersResponse {
  wall: Prayer[];
  archiveSample: Prayer[];
  totalWall: number;
  totalArchive: number;
  generatedAt: string;
}

// Configuration for display strategy
const DISPLAY_CONFIG = {
  prayersPerPage: 7,
  pageDisplayTime: 18000, // 18 seconds
  recentDays: 7, // Consider prayers from last 7 days as "recent"
  instructionPageFrequency: 10, // Show instruction page every 10 pages
  // Weighted strategy selection
  recentWeight: 0.70,
  olderWeight: 0.25,
  archiveWeight: 0.05,
};

type DisplayStrategy = 'recent' | 'older' | 'archive' | 'instruction';

export default function PrayerWallDisplay() {
  const [wallPrayers, setWallPrayers] = useState<Prayer[]>([]);
  const [archivePrayers, setArchivePrayers] = useState<Prayer[]>([]);
  const [totalWall, setTotalWall] = useState(0);
  const [totalArchive, setTotalArchive] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [displayStrategy, setDisplayStrategy] = useState<DisplayStrategy>('recent');
  const pageCountRef = useRef(0);

  // Separate wall prayers into recent and older
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

  const { recent, older } = separatePrayers(wallPrayers);

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
        setWallPrayers(data.wall);
        setArchivePrayers(data.archiveSample);
        setTotalWall(data.totalWall);
        setTotalArchive(data.totalArchive);
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

  // Smart page rotation logic with useRef to fix interval dependency bug
  useEffect(() => {
    const timer = setInterval(() => {
      pageCountRef.current += 1;
      const currentCount = pageCountRef.current;

      // Show instruction page every N pages
      if (currentCount > 0 && currentCount % DISPLAY_CONFIG.instructionPageFrequency === 0) {
        setDisplayStrategy('instruction');
        setCurrentPage(0);
        return;
      }

      // Weighted strategy selection
      const rand = Math.random();
      let selectedStrategy: DisplayStrategy;

      if (rand < DISPLAY_CONFIG.recentWeight) {
        selectedStrategy = 'recent';
      } else if (rand < DISPLAY_CONFIG.recentWeight + DISPLAY_CONFIG.olderWeight) {
        selectedStrategy = 'older';
      } else {
        selectedStrategy = 'archive';
      }

      // Get prayers for selected strategy
      let prayersToShow: Prayer[] = [];
      switch (selectedStrategy) {
        case 'recent':
          prayersToShow = recent;
          break;
        case 'older':
          prayersToShow = older;
          break;
        case 'archive':
          prayersToShow = archivePrayers;
          break;
      }

      // Fallback if selected category is empty
      if (prayersToShow.length === 0) {
        if (recent.length > 0) {
          selectedStrategy = 'recent';
          prayersToShow = recent;
        } else if (older.length > 0) {
          selectedStrategy = 'older';
          prayersToShow = older;
        } else if (archivePrayers.length > 0) {
          selectedStrategy = 'archive';
          prayersToShow = archivePrayers;
        } else {
          setDisplayStrategy('instruction');
          setCurrentPage(0);
          return;
        }
      }

      setDisplayStrategy(selectedStrategy);
      const maxPages = Math.ceil(prayersToShow.length / DISPLAY_CONFIG.prayersPerPage);

      if (selectedStrategy === 'recent') {
        // For recent prayers, cycle through pages sequentially
        setCurrentPage(prev => (prev + 1) % maxPages);
      } else {
        // For older/archive prayers, show random pages for variety
        setCurrentPage(Math.floor(Math.random() * maxPages));
      }
    }, DISPLAY_CONFIG.pageDisplayTime);

    return () => clearInterval(timer);
  }, [recent, older, archivePrayers]);

  if (isLoading && wallPrayers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 flex items-center justify-center">
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
      <div className="liquid-glass rounded-2xl shadow-xl p-12 max-w-3xl">
        <h2 className="text-5xl font-bold text-white mb-12">Submit Your Prayer Intention</h2>
        <div className="space-y-8 text-2xl text-slate-100">
          <p className="mb-8 text-3xl">
            Use the iPad in the church to submit your prayer intention
          </p>
          <p className="text-amber-300/80 text-3xl">
            - or -
          </p>
          <p className="text-3xl">
            Visit <span className="text-amber-300 font-semibold">prayerwall.sainthelen.org</span><br />
            on your mobile device
          </p>
          <div className="mt-12 flex justify-center">
            <CandleIcon size="lg" />
          </div>
        </div>

        {/* Show stats */}
        <div className="mt-8 pt-8 border-t border-white/10">
          <p className="text-slate-300 text-xl">
            {totalWall + totalArchive} prayers shared • {recent.length} this week
          </p>
        </div>
      </div>
    </div>
  );

  // Get prayers to display based on current strategy
  const getPrayersToDisplay = () => {
    if (displayStrategy === 'instruction') return [];

    let prayersToShow: Prayer[];
    switch (displayStrategy) {
      case 'recent':
        prayersToShow = recent;
        break;
      case 'older':
        prayersToShow = older;
        break;
      case 'archive':
        prayersToShow = archivePrayers;
        break;
      default:
        prayersToShow = [];
    }

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

  // Get strategy label and color
  const getStrategyInfo = () => {
    switch (displayStrategy) {
      case 'recent':
        return { label: 'Recent', color: 'bg-teal-400', textColor: 'text-teal-400' };
      case 'older':
        return { label: 'From the Archive', color: 'bg-sky-400', textColor: 'text-sky-400' };
      case 'archive':
        return { label: 'Jubilee Year of Hope', color: 'bg-amber-300', textColor: 'text-amber-300' };
      default:
        return { label: '', color: '', textColor: '' };
    }
  };

  const strategyInfo = getStrategyInfo();

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 overflow-hidden"
      style={{
        height: '100vh',
        width: '100vw',
        transform: 'translate3d(0, 0, 0)',
        WebkitFontSmoothing: 'antialiased'
      }}
    >
      <header className="text-center py-8 liquid-glass-header border-b border-white/10">
        <div className="flex justify-center items-center gap-8 mb-6">
          <Image
            src="/images/Saint-Helen-Submark-White.png"
            alt="Saint Helen Logo"
            width={500}
            height={84}
            className="w-[500px] h-auto"
            priority
          />
        </div>
        <div className="flex items-center justify-center gap-4">
          <h1 className="text-6xl font-bold text-white">
            Prayer Wall
          </h1>
          {displayStrategy !== 'instruction' && (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${strategyInfo.color}`}></div>
              <span className={`text-xl ${strategyInfo.textColor}`}>
                {strategyInfo.label}
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
                className="liquid-glass rounded-xl shadow-xl p-8 opacity-0 animate-fadeIn"
                style={{
                  animationDelay: `${index * 200}ms`,
                  animationFillMode: 'forwards'
                }}
              >
                <div className="flex items-start gap-6">
                  <CandleIcon size="sm" />
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
                        displayStrategy === 'archive'
                          ? 'bg-amber-300/20 text-amber-300'
                          : displayStrategy === 'recent'
                            ? 'bg-teal-400/20 text-teal-400'
                            : 'bg-sky-400/20 text-sky-400'
                      }`}>
                        {displayStrategy === 'archive' ? 'Jubilee 2025' : getRelativeTime(prayer.created_at)}
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
