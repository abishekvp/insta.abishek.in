import React from 'react';
import { Database, Clock, HardDrive, Trash2, ShieldCheck, Sparkles } from 'lucide-react';
import { StorageMetrics } from '../types';

interface Props {
  metrics: StorageMetrics | null;
  onPurgeClick: () => void;
  isPurging: boolean;
}

export const TTLPolicyBanner: React.FC<Props> = ({ metrics, onPurgeClick, isPurging }) => {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center shrink-0 mt-0.5 text-zinc-100">
          <Clock className="w-5 h-5 text-brand-pink" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-white tracking-tight">
              Automated 30-Day Story Storage Retention
            </h4>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Active Policy
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            Stories are securely stored in high definition for exactly <strong className="text-zinc-200">30 days</strong> from ingestion. After 30 days, media files are automatically purged to keep your disk usage optimal.
          </p>

          {metrics && (
            <div className="flex items-center gap-4 mt-3 text-xs text-zinc-300 flex-wrap">
              <span className="flex items-center gap-1.5 font-medium">
                <Database className="w-3.5 h-3.5 text-zinc-400" />
                Active Storage: <span className="text-white font-semibold">{metrics.activeStorageFormatted}</span>
                <span className="text-zinc-500">({metrics.activeStoriesCount} stories)</span>
              </span>
              <span className="text-zinc-700">|</span>
              <span className="flex items-center gap-1.5 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                Reclaimed: <span className="text-emerald-400 font-semibold">{metrics.purgedStorageFormatted}</span>
                <span className="text-zinc-500">({metrics.purgedStoriesCount} expired purged)</span>
              </span>
              {metrics.expiringWithin24h > 0 && (
                <>
                  <span className="text-zinc-700">|</span>
                  <span className="text-amber-400 font-medium">
                    ⚠️ {metrics.expiringWithin24h} story expiring in &lt;24h
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
        <button
          onClick={onPurgeClick}
          disabled={isPurging}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 hover:text-white border border-zinc-700/80 transition disabled:opacity-50"
          title="Manually trigger cleanup of any stories exceeding 30-day retention"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span>{isPurging ? 'Purging Expired...' : 'Run 30d Cleanup'}</span>
        </button>
      </div>
    </div>
  );
};
