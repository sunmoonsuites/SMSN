import React from 'react';
import { AlertCircle, Database, ArrowRight } from 'lucide-react';
import { getSupabaseConfig } from '../../lib/supabase';

interface ConfigurationRequiredBannerProps {
  onOpenConfig: () => void;
}

export const ConfigurationRequiredBanner: React.FC<ConfigurationRequiredBannerProps> = ({
  onOpenConfig,
}) => {
  const config = getSupabaseConfig();
  if (config.url && config.anonKey) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-stone-900 text-white px-4 py-2.5 text-xs shadow-inner flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <span className="p-1 rounded bg-amber-600/50">
          <AlertCircle className="w-4 h-4 text-amber-200 shrink-0" />
        </span>
        <div>
          <span className="font-bold tracking-wide uppercase text-amber-200 mr-2">Configuration Required:</span>
          <span>Supabase database connection is not configured yet.</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenConfig}
        className="px-3 py-1 bg-white text-stone-950 hover:bg-amber-100 rounded font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
      >
        <Database className="w-3.5 h-3.5 text-amber-800" />
        Connect Supabase Database
        <ArrowRight className="w-3 h-3 text-stone-500" />
      </button>
    </div>
  );
};
