import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, CloudOff, RefreshCw } from 'lucide-react';
import { offlineService, type OfflineState } from '../../services/offlineService';
import { cn } from '../../lib/utils';

interface OfflineIndicatorProps {
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className }) => {
  const [state, setState] = useState<OfflineState>(offlineService.getState());
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const unsubscribe = offlineService.subscribe((newState) => {
      setState(newState);
      // Show banner when going offline
      if (!newState.isOnline) {
        setShowBanner(true);
      }
    });
    return unsubscribe;
  }, []);

  // Auto-hide banner after coming back online
  useEffect(() => {
    if (state.isOnline && showBanner) {
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.isOnline, showBanner]);

  return (
    <>
      {/* Status indicator in toolbar */}
      <div className={cn("flex items-center gap-1.5", className)}>
        {state.isOnline ? (
          <Wifi className="w-4 h-4 text-green-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-yellow-500" />
        )}
        {state.pendingSync > 0 && (
          <span className="text-xs text-yellow-500 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            {state.pendingSync}
          </span>
        )}
      </div>

      {/* Offline banner */}
      {showBanner && !state.isOnline && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-yellow-500/90 text-yellow-950 rounded-xl shadow-lg backdrop-blur-sm">
            <CloudOff className="w-5 h-5" />
            <div>
              <p className="font-medium text-sm">You're offline</p>
              <p className="text-xs opacity-80">Changes will sync when you're back online</p>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="ml-2 p-1 hover:bg-yellow-600/20 rounded"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Back online banner */}
      {showBanner && state.isOnline && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-green-500/90 text-green-950 rounded-xl shadow-lg backdrop-blur-sm">
            <Wifi className="w-5 h-5" />
            <p className="font-medium text-sm">Back online</p>
          </div>
        </div>
      )}
    </>
  );
};

export default OfflineIndicator;
