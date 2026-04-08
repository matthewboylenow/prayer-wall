'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react';
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

const DISPLAY_CONFIG = {
  prayersPerPage: 7,
  pageDisplayTime: 18000, // 18 seconds visible
  transitionDuration: 800, // ms for fade out/in
  recentDays: 7,
  instructionPageFrequency: 10,
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
  const [isVisible, setIsVisible] = useState(true);
  const pageCountRef = useRef(0);

  // FIX: useMemo stabilizes array references so the timer interval
  // doesn't tear down and recreate on every render
  const { recent, older } = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DISPLAY_CONFIG.recentDays);

    const recentPrayers: Prayer[] = [];
    const olderPrayers: Prayer[] = [];

    wallPrayers.forEach(prayer => {
      if (new Date(prayer.created_at) > cutoffDate) {
        recentPrayers.push(prayer);
      } else {
        olderPrayers.push(prayer);
      }
    });

    return { recent: recentPrayers, older: olderPrayers };
  }, [wallPrayers]);

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
    const interval = setInterval(fetchPrayers, 300000);
    return () => clearInterval(interval);
  }, []);

  // Stable page rotation with cross-fade transitions
  useEffect(() => {
    const timer = setInterval(() => {
      // Step 1: Fade out current content
      setIsVisible(false);

      // Step 2: After fade-out completes, update content and fade back in
      setTimeout(() => {
        pageCountRef.current += 1;
        const currentCount = pageCountRef.current;

        // Show instruction page every N rotations
        if (currentCount > 0 && currentCount % DISPLAY_CONFIG.instructionPageFrequency === 0) {
          setDisplayStrategy('instruction');
          setCurrentPage(0);
          setIsVisible(true);
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
            setIsVisible(true);
            return;
          }
        }

        setDisplayStrategy(selectedStrategy);
        const maxPages = Math.ceil(prayersToShow.length / DISPLAY_CONFIG.prayersPerPage);

        if (selectedStrategy === 'recent') {
          setCurrentPage(prev => (prev + 1) % maxPages);
        } else {
          setCurrentPage(Math.floor(Math.random() * maxPages));
        }

        setIsVisible(true);
      }, DISPLAY_CONFIG.transitionDuration);
    }, DISPLAY_CONFIG.pageDisplayTime);

    return () => clearInterval(timer);
  }, [recent, older, archivePrayers]);

  if (isLoading && wallPrayers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-dark via-navy to-navy-dark flex items-center justify-center">
        <div className="text-center">
          <Image
            src="/images/Saint-Helen-Submark-White.png"
            alt="Saint Helen Logo"
            width={500}
            height={84}
            className="w-[500px] h-auto mx-auto mb-12"
            priority
          />
          <div className="text-cream text-4xl font-heading animate-pulse">
            Loading prayers...
          </div>
        </div>
      </div>
    );
  }

  const InstructionPage = () => (
    <div key="instruction-page" className="flex flex-col items-center justify-center h-full text-center px-12">
      <div className="liquid-glass rounded-2xl shadow-xl p-12 max-w-3xl">
        <h2 className="text-5xl font-bold text-cream font-heading mb-12">Submit Your Prayer Intention</h2>
        <div className="space-y-8 text-2xl text-cream/90 font-body">
          <p className="mb-8 text-3xl">
            Use the iPad in the church to submit your prayer intention
          </p>
          <p className="text-gold text-3xl">
            - or -
          </p>
          <p className="text-3xl">
            Visit <span className="text-gold font-semibold">prayerwall.sainthelen.org</span><br />
            on your mobile device
          </p>
          <div className="mt-12 flex justify-center">
            <CandleIcon size="lg" />
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-cream/10">
          <p className="text-cream/60 text-xl font-body">
            {totalWall + totalArchive} prayers shared &bull; {recent.length} this week
          </p>
        </div>
      </div>
    </div>
  );

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

  const getStrategyInfo = () => {
    switch (displayStrategy) {
      case 'recent':
        return { label: 'Recent Prayers', color: 'bg-gold', textColor: 'text-gold' };
      case 'older':
        return { label: 'From the Archive', color: 'bg-cream/60', textColor: 'text-cream/60' };
      case 'archive':
        return { label: 'Jubilee Year of Hope', color: 'bg-rust', textColor: 'text-rust-light' };
      default:
        return { label: '', color: '', textColor: '' };
    }
  };

  const strategyInfo = getStrategyInfo();

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-navy-dark via-navy to-navy-dark overflow-hidden"
      style={{
        height: '100vh',
        width: '100vw',
        transform: 'translate3d(0, 0, 0)',
        WebkitFontSmoothing: 'antialiased'
      }}
    >
      <header className="text-center py-8 liquid-glass-header border-b border-cream/10">
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
          <h1 className="text-6xl font-bold text-cream font-heading">
            Prayer Wall
          </h1>
          {displayStrategy !== 'instruction' && (
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${strategyInfo.color}`}></div>
              <span className={`text-xl font-body ${strategyInfo.textColor}`}>
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
          <div
            className="h-full transition-opacity ease-in-out"
            style={{
              opacity: isVisible ? 1 : 0,
              transitionDuration: `${DISPLAY_CONFIG.transitionDuration}ms`,
            }}
          >
            <InstructionPage />
          </div>
        ) : (
          <div
            className="space-y-6 transition-opacity ease-in-out"
            style={{
              opacity: isVisible ? 1 : 0,
              transitionDuration: `${DISPLAY_CONFIG.transitionDuration}ms`,
            }}
          >
            {displayedPrayers.map((prayer, index) => (
              <div
                key={`${prayer.id}-${currentPage}-${displayStrategy}`}
                className="liquid-glass rounded-xl shadow-xl p-8 opacity-0 animate-fadeIn"
                style={{
                  animationDelay: `${index * 150}ms`,
                  animationFillMode: 'forwards'
                }}
              >
                <div className="flex items-start gap-6">
                  <CandleIcon size="sm" />
                  <div className="flex-1">
                    <p className="text-xl text-cream leading-relaxed font-body">
                      {prayer.content}
                    </p>
                    <div className="flex justify-between items-center mt-4">
                      <p className="text-lg text-cream/40 font-body">
                        {new Date(prayer.created_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                      <span className={`text-sm px-3 py-1 rounded-full font-body ${
                        displayStrategy === 'archive'
                          ? 'bg-rust/20 text-rust-light'
                          : displayStrategy === 'recent'
                            ? 'bg-gold/20 text-gold'
                            : 'bg-cream/10 text-cream/50'
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
