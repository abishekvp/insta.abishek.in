import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Film,
  Image as ImageIcon,
  Heart,
  Clock,
  Trash2,
  Plus,
  RefreshCw
} from 'lucide-react';
import { ApiService } from '../services/api';
import { Story } from '../types';
import { StoryCard } from '../components/StoryCard';
import { StoryViewerModal } from '../components/StoryViewerModal';

interface Props {
  onOpenQuickSave: () => void;
}

export const StoryVault: React.FC<Props> = ({ onOpenQuickSave }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [search, setSearch] = useState('');
  const [mediaType, setMediaType] = useState<'all' | 'image' | 'video'>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'expiring_soon'>('newest');
  const [isLoading, setIsLoading] = useState(false);
  const [activeViewerModal, setActiveViewerModal] = useState<{ stories: Story[]; initialIndex: number } | null>(null);

  const fetchStories = async () => {
    setIsLoading(true);
    try {
      const res = await ApiService.getStories({
        mediaType: mediaType !== 'all' ? mediaType : undefined,
        onlyFavorites,
        search: search.trim() || undefined
      });
      let list = res.stories || [];

      if (sortBy === 'expiring_soon') {
        list = [...list].sort(
          (a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
        );
      }

      setStories(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, [mediaType, onlyFavorites, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStories();
  };

  const handleToggleFavorite = async (storyId: string) => {
    await ApiService.toggleStoryFavorite(storyId);
    setStories((prev) =>
      prev.map((s) => (s.id === storyId ? { ...s, is_favorited: s.is_favorited ? 0 : 1 } : s))
    );
  };

  const handleOpenViewer = (story: Story) => {
    const idx = stories.findIndex((s) => s.id === story.id);
    setActiveViewerModal({
      stories,
      initialIndex: idx >= 0 ? idx : 0
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Saved Story Vault</h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Archived stories with automated 30-day storage retention policy
          </p>
        </div>

        <button
          onClick={onOpenQuickSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Save Story URL</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by username or caption..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-white placeholder-zinc-500 focus:outline-none transition"
          />
        </form>

        {/* Media Type Tabs & Filters */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <div className="flex items-center bg-zinc-950 rounded-xl border border-zinc-800 p-1 text-xs">
            <button
              onClick={() => setMediaType('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                mediaType === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({stories.length})
            </button>
            <button
              onClick={() => setMediaType('image')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                mediaType === 'image' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-zinc-400" />
              Photos
            </button>
            <button
              onClick={() => setMediaType('video')}
              className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                mediaType === 'video' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Film className="w-3.5 h-3.5 text-brand-pink" />
              Videos
            </button>
          </div>

          <button
            onClick={() => setOnlyFavorites((f) => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition ${
              onlyFavorites
                ? 'bg-rose-500/15 text-brand-pink border-rose-500/30'
                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-brand-pink' : ''}`} />
            <span>Favorites</span>
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-brand-pink"
          >
            <option value="newest">Sort: Newest Download</option>
            <option value="expiring_soon">Sort: Expiring Soonest (30d TTL)</option>
          </select>

          <button
            onClick={fetchStories}
            className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white transition"
            title="Refresh Stories"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-pink' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stories Grid */}
      {stories.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onView={handleOpenViewer}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl space-y-3">
          <Film className="w-10 h-10 text-zinc-600 mx-auto" />
          <h4 className="text-sm font-semibold text-white">No stories match your filter</h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Try adjusting your search query, or use the Save Story button to archive stories with 30-day retention.
          </p>
        </div>
      )}

      {/* Story Viewer Modal */}
      {activeViewerModal && (
        <StoryViewerModal
          stories={activeViewerModal.stories}
          initialIndex={activeViewerModal.initialIndex}
          onClose={() => setActiveViewerModal(null)}
          onStoryViewed={fetchStories}
        />
      )}
    </div>
  );
};
