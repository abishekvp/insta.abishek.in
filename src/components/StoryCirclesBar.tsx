import React from 'react';
import { StoryGroup } from '../types';
import { Plus } from 'lucide-react';

interface Props {
  groups: StoryGroup[];
  onSelectGroup: (group: StoryGroup) => void;
  onOpenQuickSave: () => void;
}

export const StoryCirclesBar: React.FC<Props> = ({ groups, onSelectGroup, onOpenQuickSave }) => {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-card">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Saved Friends' Stories
        </h3>
        <span className="text-xs text-zinc-500 font-medium">
          {groups.length} Active {groups.length === 1 ? 'Friend' : 'Friends'}
        </span>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
        {/* Quick Add / Save Button */}
        <button
          onClick={onOpenQuickSave}
          className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
        >
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-700 group-hover:border-brand-pink/70 flex items-center justify-center bg-zinc-900 group-hover:bg-zinc-800/80 transition-all">
            <Plus className="w-5 h-5 text-zinc-400 group-hover:text-brand-pink transition" />
          </div>
          <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition">
            Save Story
          </span>
        </button>

        {/* Friend Circles */}
        {groups.map((group) => {
          const count = group.stories.length;
          return (
            <button
              key={group.username}
              onClick={() => onSelectGroup(group)}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div
                className={`rounded-full transition-transform transform group-hover:scale-105 ${
                  group.hasUnviewed
                    ? 'ig-gradient-ring shadow-brand'
                    : 'p-[2px] border-2 border-zinc-700/80'
                }`}
              >
                <div className="relative w-15 h-15 w-[60px] h-[60px] rounded-full overflow-hidden bg-zinc-900 border-2 border-black">
                  <img
                    src={group.avatar}
                    alt={group.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {count > 1 && (
                    <span className="absolute bottom-0 right-0 bg-zinc-950 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-zinc-700 leading-none">
                      {count}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-medium text-zinc-300 truncate max-w-[70px] group-hover:text-white transition">
                {group.username}
              </span>
            </button>
          );
        })}

        {groups.length === 0 && (
          <div className="text-xs text-zinc-500 py-3 px-2">
            No active stories saved yet. Add friends to your watchlist or use Save Story!
          </div>
        )}
      </div>
    </div>
  );
};
