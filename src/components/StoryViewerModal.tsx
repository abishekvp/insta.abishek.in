import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Story } from '../types';
import { ApiService } from '../services/api';

interface Props {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  onStoryViewed?: (storyId: string) => void;
}

export const StoryViewerModal: React.FC<Props> = ({
  stories,
  initialIndex = 0,
  onClose,
  onStoryViewed
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (!currentStory) return;
    setIsFavorited(currentStory.is_favorited === 1);
    setProgress(0);

    // Mark as viewed in background
    ApiService.markStoryViewed(currentStory.id).catch(() => {});
    if (onStoryViewed) onStoryViewed(currentStory.id);
  }, [currentIndex, currentStory]);

  // Timer loop for images or video progress
  useEffect(() => {
    if (!currentStory || isPaused) return;

    if (currentStory.media_type === 'image') {
      const stepTimeMs = 50;
      const totalDurationMs = (currentStory.duration || 5) * 1000;
      const stepPercent = (stepTimeMs / totalDurationMs) * 100;

      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            handleNext();
            return 0;
          }
          return prev + stepPercent;
        });
      }, stepTimeMs);

      return () => clearInterval(interval);
    }
  }, [currentIndex, isPaused, currentStory]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'Escape') onClose();
      else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, stories.length]);

  if (!currentStory) return null;

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const res = await ApiService.toggleStoryFavorite(currentStory.id);
      if (res) {
        setIsFavorited(res.is_favorited === 1);
        currentStory.is_favorited = res.is_favorited;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate Remaining TTL Days/Hours until 30-day expiration
  const getExpirationText = (expiresAt: string) => {
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return 'Expired';
    const days = Math.floor(diffMs / (24 * 3600 * 1000));
    const hours = Math.floor((diffMs % (24 * 3600 * 1000)) / (3600 * 1000));
    if (days > 0) return `${days}d ${hours}h left (30d TTL)`;
    return `${hours}h left (Purging Soon!)`;
  };

  const isVideo = currentStory.media_type === 'video';
  const mediaSrc = currentStory.media_url.startsWith('http')
    ? currentStory.media_url
    : `/api/media/${currentStory.local_filename}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center select-none">
      {/* Top Close Button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 z-50 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Nav Arrow Left */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrev}
          className="absolute left-4 md:left-12 z-40 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 hidden sm:flex items-center justify-center transition"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Nav Arrow Right */}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 md:right-12 z-40 p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 hidden sm:flex items-center justify-center transition"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Main Story Container */}
      <div className="relative w-full max-w-[420px] h-[85vh] max-h-[780px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col justify-between">
        {/* Top Overlay: Progress Bars & Profile Header */}
        <div className="absolute top-0 inset-x-0 z-30 p-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Progress Segment Bars */}
          <div className="flex items-center gap-1.5 mb-3">
            {stories.map((s, idx) => {
              let width = '0%';
              if (idx < currentIndex) width = '100%';
              else if (idx === currentIndex) width = `${progress}%`;

              return (
                <div key={s.id} className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-75 ease-linear"
                    style={{ width }}
                  />
                </div>
              );
            })}
          </div>

          {/* User Details & TTL Expiration Badge */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <div className="p-[1.5px] ig-gradient-bg rounded-full">
                <img
                  src={currentStory.user_avatar}
                  alt={currentStory.target_username}
                  className="w-8 h-8 rounded-full object-cover border border-black"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold tracking-wide leading-none">
                    {currentStory.target_username}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    • {new Date(currentStory.posted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/60 text-zinc-300 border border-white/10 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-brand-pink" />
                    {getExpirationText(currentStory.expires_at)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isVideo && (
                <button
                  onClick={() => setIsMuted((m) => !m)}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={() => setIsPaused((p) => !p)}
                className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Media Player Body */}
        <div
          className="relative w-full h-full flex items-center justify-center bg-black cursor-pointer"
          onClick={() => setIsPaused((p) => !p)}
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={mediaSrc}
              autoPlay
              playsInline
              loop={false}
              muted={isMuted}
              className="w-full h-full object-cover"
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                if (el.duration) {
                  const p = (el.currentTime / el.duration) * 100;
                  setProgress(p);
                }
              }}
              onEnded={handleNext}
            />
          ) : (
            <img
              src={mediaSrc}
              alt={currentStory.caption || 'Instagram Story'}
              className="w-full h-full object-cover"
            />
          )}

          {/* Pause Indicator overlay */}
          {isPaused && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
              <div className="p-3.5 rounded-full bg-black/60 text-white border border-white/20">
                <Pause className="w-8 h-8" />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="absolute bottom-0 inset-x-0 z-30 p-3.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2">
          {currentStory.caption && (
            <p className="text-xs text-zinc-200 line-clamp-2 px-1">
              {currentStory.caption}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-400">
              Saved • {((currentStory.file_size || 0) / (1024 * 1024)).toFixed(1)} MB
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFavorite}
                className={`p-2 rounded-xl border transition ${
                  isFavorited
                    ? 'bg-rose-500/20 text-brand-pink border-rose-500/40'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
                title="Save to Favorites"
              >
                <Heart className={`w-4 h-4 ${isFavorited ? 'fill-brand-pink' : ''}`} />
              </button>

              <a
                href={mediaSrc}
                download={currentStory.local_filename}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition"
                title="Download original high-res media"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
