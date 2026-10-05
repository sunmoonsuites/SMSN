import React, { useEffect, useState } from 'react';
import { Users, ShieldCheck } from 'lucide-react';
import { recordOrFetchUniqueVisitor, getInitialCachedVisitorCount } from '../../services/visitorService';

export const VisitorCounter: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [visitorCount, setVisitorCount] = useState<number>(getInitialCachedVisitorCount);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    recordOrFetchUniqueVisitor().then(({ count }) => {
      if (isMounted) {
        setVisitorCount(count);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const formattedCount = visitorCount.toLocaleString('en-IN');

  return (
    <div
      className={`inline-flex flex-col items-center sm:items-start gap-1 ${className}`}
      title="Live verified unique visitors. Refreshing the page does not increase count."
    >
      <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-stone-900/90 border border-stone-800 text-stone-300 shadow-inner hover:border-amber-700/50 transition-colors">
        {/* Live Pulse Dot */}
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>

        {/* Counter Icon */}
        <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />

        {/* Label */}
        <span className="text-[11px] font-medium text-stone-400 tracking-wide">
          Unique Visitors:
        </span>

        {/* Number Display */}
        <div className="font-mono text-xs font-bold text-amber-300 tracking-wider bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
          {isLoading ? (
            <span className="opacity-60">{formattedCount}</span>
          ) : (
            <span>{formattedCount}</span>
          )}
        </div>

        {/* Verified Shield Badge */}
        <span
          className="text-emerald-400 text-[10px] hidden md:inline-flex items-center gap-1 font-medium bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded"
          title="Anti-Refresh Protection Active"
        >
          <ShieldCheck className="w-3 h-3" />
          Verified
        </span>
      </div>

      <span className="text-[10px] text-stone-500 tracking-tight">
        Protected against page refresh &bull; 1 count per guest
      </span>
    </div>
  );
};
