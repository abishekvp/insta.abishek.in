import React from 'react';
import { Play, Download, Heart, Clock, Video, Image as ImageIcon } from 'lucide-react';
import { Story } from '../types';

interface Props {
  story: Story;
  onView: (story: Story) => void;
  onToggleFavorite: (storyId: string) => void;
}

export const StoryCard: React.FC<Props> = ({ story, onView, onToggleFavorite }) => {
  const isVideo = story.media_type === 'video';
  const mediaSrc = story.media_url.startsWith('http')
    ? story.media_url
    : `/api/media/${story.local_filename}`;

  // Calculate days left in 30-day retention
  const diffMs = new Date(story.expires_at).getTime() - Date.now();
  const daysLeft = Math.floor(diffMs / (24 * 3600 * 1000));
  const hoursLeft = Math.floor((diffMs % (24 * 3600 * 1000)) / (3600 * 1000));
  const isExpiringSoon = daysLeft <= 2;

  const sizeMb = ((story.file_size || 0) / (1024 * 1024)).toFixed(1);

  return (
    <div className="group relative bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden shadow-card hover:border-zinc-700 transition-all flex flex-col justify-between">
      {/* Media Thumbnail Container */}
      <div
        onClick={() => onView(story)}
        className="relative aspect-[9/16] bg-zinc-950 cursor-pointer overflow-hidden"
      >
        {isVideo ? (
          <video
            src={mediaSrc}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            muted
            preload="metadata"
          />
        ) : (
          <img
            src={mediaSrc}
            alt={story.caption || 'Instagram Story'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/70 text-white backdrop-blur-md border border-white/10">
            {isVideo ? (
              <>
                <Video className="w-2.5 h-2.5 text-brand-pink" />
                {story.duration || 10}s
              </>
            ) : (
              <>
                <ImageIcon className="w-2.5 h-2.5 text-zinc-300" />
                Photo
              </>
            )}
          </span>

          <span
            className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-md border ${
              isExpiringSoon
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-black/70 text-zinc-300 border-white/10'
            }`}
          >
            <Clock className="w-2.5 h-2.5 text-zinc-400" />
            {daysLeft > 0 ? `${daysLeft}d left` : `${hoursLeft}h left`}
          </span>
        </div>

        {/* Center Hover Play Icon */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/90 text-zinc-950 shadow-lg flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-zinc-950 ml-0.5" />
          </div>
        </div>

        {/* Bottom user strip inside thumbnail */}
        <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-[1px] ig-gradient-bg rounded-full">
              <img
                src={story.user_avatar}
                alt={story.target_username}
                className="w-5 h-5 rounded-full object-cover border border-black"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="text-xs font-semibold text-white truncate max-w-[110px]">
              {story.target_username}
            </span>
          </div>

          <span className="text-[10px] text-zinc-300 font-medium">
            {sizeMb} MB
          </span>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="p-3 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between">
        <div className="text-[11px] text-zinc-400 truncate max-w-[130px]">
          {story.caption || 'No caption'}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onToggleFavorite(story.id)}
            className={`p-1.5 rounded-lg border transition ${
              story.is_favorited
                ? 'bg-rose-500/15 text-brand-pink border-rose-500/30'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700/80'
            }`}
            title="Favorite"
          >
            <Heart className={`w-3.5 h-3.5 ${story.is_favorited ? 'fill-brand-pink' : ''}`} />
          </button>

          <a
            href={mediaSrc}
            download={story.local_filename}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 transition"
            title="Download original file"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
