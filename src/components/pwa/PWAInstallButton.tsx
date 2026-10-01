import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as standalone app, suppress
  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install"
        onClick={install}
        title="Install OmniLifeOS on your device (Android / PC)"
        className={`flex items-center gap-1 font-medium rounded-full transition shadow-2xs ${
          compact
            ? 'p-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px]'
            : 'px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px]'
        }`}
      >
        <Download className="w-3 h-3" />
        {!compact && <span>Install App</span>}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-install-ios"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1 rounded-full border border-slate-300 dark:border-slate-700 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <Smartphone className="w-3 h-3 text-indigo-500" />
          <span>Add to Home</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-500" />
                  Install on iOS Safari
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold flex items-center justify-center text-xs">
                    1
                  </div>
                  <p>Tap the <strong>Share</strong> button at the bottom of Safari.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold flex items-center justify-center text-xs">
                    2
                  </div>
                  <p>Scroll down and select <strong>Add to Home Screen</strong>.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold flex items-center justify-center text-xs">
                    3
                  </div>
                  <p>Launch OmniLifeOS anytime in full-screen standalone mode!</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback indicator button that explains universal web/android readiness
  return (
    <button
      id="btn-pwa-install-ready"
      onClick={() => alert('OmniLifeOS is universal PWA ready! In Chrome/Edge/Android, click the install icon in your browser URL bar or Add to Home screen.')}
      className="hidden md:flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-800 px-2 py-0.5 text-[10.5px] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 transition"
      title="Universal Web & Android PWA enabled"
    >
      <Smartphone className="w-3 h-3 text-emerald-500" />
      <span>PWA Ready</span>
    </button>
  );
};
