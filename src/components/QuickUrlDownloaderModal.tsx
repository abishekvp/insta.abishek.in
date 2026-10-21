import React, { useState } from 'react';
import { X, Link2, Download, AlertCircle, CheckCircle2, Video, Image as ImageIcon, Instagram } from 'lucide-react';
import { ApiService } from '../services/api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickUrlDownloaderModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [ttlDays, setTtlDays] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [inspectedMedia, setInspectedMedia] = useState<any | null>(null);

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      setErrorMsg('Please enter an Instagram story or post URL.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const data = await ApiService.quickInspectUrl(url);
      setInspectedMedia(data);
      if (data.caption) setCaption(data.caption);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to inspect Instagram URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToVault = async () => {
    if (!inspectedMedia) return;
    setIsLoading(true);

    try {
      if (inspectedMedia.stories && inspectedMedia.stories.length > 0) {
        // Bulk save all active stories for this creator
        for (const st of inspectedMedia.stories) {
          await ApiService.saveStory({
            targetUsername: inspectedMedia.targetUsername,
            userFullName: inspectedMedia.userFullName || `@${inspectedMedia.targetUsername}`,
            userAvatar: inspectedMedia.userAvatar || '',
            mediaType: st.mediaType,
            mediaUrl: st.mediaUrl,
            caption: st.caption || caption || `Story from @${inspectedMedia.targetUsername}`,
            postedAt: st.takenAt,
            duration: st.duration,
            ttlDays: ttlDays
          });
        }
      } else {
        await ApiService.saveStory({
          targetUsername: inspectedMedia.targetUsername,
          userFullName: inspectedMedia.userFullName || `@${inspectedMedia.targetUsername}`,
          userAvatar: inspectedMedia.userAvatar || '',
          mediaType: inspectedMedia.mediaType,
          mediaUrl: inspectedMedia.mediaUrl,
          caption: caption || `Story from @${inspectedMedia.targetUsername}`,
          ttlDays: ttlDays
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl ig-gradient-bg p-[1.5px] shadow-brand">
              <div className="w-full h-full bg-zinc-900 rounded-[10px] flex items-center justify-center">
                <Link2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Save Story by URL</h3>
              <p className="text-xs text-zinc-400">Download directly into your 30-day vault</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!inspectedMedia ? (
            <form onSubmit={handleInspect} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Instagram Username or Story / Post Link
                </label>
                <input
                  type="text"
                  placeholder="@username or https://www.instagram.com/stories/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                />
              </div>

              <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Storage Retention:</span>
                <span className="font-semibold text-white">30 Days (Auto-Purge)</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl ig-gradient-bg text-white font-semibold text-sm shadow-brand hover:opacity-95 transition disabled:opacity-50"
              >
                {isLoading ? 'Inspecting Media...' : 'Inspect & Fetch Media'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="w-16 h-20 bg-zinc-900 rounded-lg overflow-hidden shrink-0">
                  {inspectedMedia.mediaType === 'video' ? (
                    <video src={inspectedMedia.mediaUrl} className="w-full h-full object-cover" />
                  ) : (
                    <img src={inspectedMedia.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                  )}
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">@{inspectedMedia.targetUsername}</span>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                    {inspectedMedia.mediaType === 'video' ? (
                      <>
                        <Video className="w-3.5 h-3.5 text-brand-pink" />
                        <span>Video Story</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Photo Story</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-400 mt-1">
                    Ready to save with 30-day storage policy
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Optional Caption / Note
                </label>
                <input
                  type="text"
                  placeholder="Add a custom note or description..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-pink text-xs text-white placeholder-zinc-500 focus:outline-none transition"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInspectedMedia(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSaveToVault}
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl ig-gradient-bg text-white font-semibold text-xs shadow-brand hover:opacity-95 transition disabled:opacity-50"
                >
                  {isLoading
                    ? 'Saving Stories...'
                    : inspectedMedia.storyCount && inspectedMedia.storyCount > 1
                    ? `Confirm & Archive All ${inspectedMedia.storyCount} Stories (30d)`
                    : 'Confirm & Save to Vault (30d)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
