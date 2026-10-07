import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  ArrowRight,
  ShieldCheck,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import {
  auditMediaForEgressRisk,
  execute1ClickCloudflareMigration,
  EgressAuditResult,
  MigrationProgressUpdate,
} from '../../services/cloudflareMediaMigrationService';

export const CloudflareMediaCard: React.FC = () => {
  const [audit, setAudit] = useState<EgressAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(true);
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [progress, setProgress] = useState<MigrationProgressUpdate | null>(null);
  const [migrationSummary, setMigrationSummary] = useState<{
    migratedCount: number;
    egressSavedMB: number;
  } | null>(null);

  const runAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await auditMediaForEgressRisk();
      setAudit(res);
    } catch (e) {
      console.warn('[CloudflareMediaCard] Audit error:', e);
    } finally {
      setIsAuditing(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  const handleStart1ClickMigration = async () => {
    setIsMigrating(true);
    setProgress({
      current: 0,
      total: audit?.itemsToMigrate.length || 1,
      percent: 0,
      itemTitle: 'Starting media migration...',
      status: 'migrating',
    });

    try {
      const res = await execute1ClickCloudflareMigration((update) => {
        setProgress(update);
      });

      if (res.success) {
        setMigrationSummary({
          migratedCount: res.migratedCount,
          egressSavedMB: res.egressSavedMB,
        });
        await runAudit();
      }
    } catch (err) {
      console.error('[CloudflareMediaCard] Migration failed:', err);
    } finally {
      setIsMigrating(false);
    }
  };

  const hasEgressRisk = (audit?.supabaseImagesCount ?? 0) > 0 || (audit?.externalImagesCount ?? 0) > 0;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-stone-200 bg-gradient-to-r from-stone-50 via-white to-amber-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800">
              <Cloud className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-serif font-bold text-stone-900 text-base">
                  Cloudflare Media CDN &amp; Zero-Egress Storage
                </h4>
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                  100% Free Forever
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Eliminate Supabase &ldquo;Cached Egress Limit Exceeded&rdquo; by serving hotel images through Cloudflare Pages Edge CDN.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={runAudit}
          disabled={isAuditing || isMigrating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin text-amber-700' : 'text-stone-400'}`} />
          <span>{isAuditing ? 'Auditing...' : 'Check Storage'}</span>
        </button>
      </div>

      {/* Content & Metrics */}
      <div className="p-6 space-y-6">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Total Hotel Media
            </div>
            <div className="text-2xl font-serif font-bold text-stone-900">
              {audit?.totalImages ?? '—'}
            </div>
            <p className="text-[10px] text-stone-400">Hero, Rooms &amp; Gallery photos</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
              Cloudflare CDN (0 Egress)
            </div>
            <div className="text-2xl font-serif font-bold text-emerald-950">
              {audit?.cloudflareImagesCount ?? '—'}
            </div>
            <p className="text-[10px] text-emerald-700 font-medium">Unlimited free bandwidth</p>
          </div>

          <div className={`p-4 rounded-xl space-y-1 border ${
            hasEgressRisk
              ? 'bg-amber-50/80 border-amber-300'
              : 'bg-stone-50 border-stone-200'
          }`}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-900">
              Supabase / External CDN
            </div>
            <div className="text-2xl font-serif font-bold text-amber-950">
              {(audit?.supabaseImagesCount ?? 0) + (audit?.externalImagesCount ?? 0)}
            </div>
            <p className="text-[10px] text-amber-800">Consuming monthly egress limit</p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Monthly Egress Saved
            </div>
            <div className="text-2xl font-serif font-bold text-stone-900">
              {audit ? `${Math.round(audit.estimatedMonthlyEgressMB / 1024 * 10) / 10} GB` : '—'}
            </div>
            <p className="text-[10px] text-stone-400">Free bandwidth saved on Cloudflare</p>
          </div>
        </div>

        {/* Status & 1-Click Action */}
        {hasEgressRisk ? (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{(audit?.itemsToMigrate.length || 0)} Images Are Consuming Supabase Egress</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Clicking the 1-Click button below will automatically download, convert to modern lightweight WebP, and save all photos into Cloudflare&rsquo;s Edge directory (<code className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded text-[11px]">/assets/mirrored/</code>). Future visitors will load images with <strong>100% free unlimited bandwidth</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStart1ClickMigration}
              disabled={isMigrating}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>{isMigrating ? 'Migrating Images...' : '1-Click Move All Images to Cloudflare'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-950">
                  All Hotel Images Are Fully Optimized on Cloudflare Edge!
                </div>
                <div className="text-[11px] text-emerald-800 mt-0.5">
                  Your Supabase Storage Egress is safe. All hotel media is served with zero egress cost and lightning-fast loading speeds.
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg shrink-0">
              Egress = 0 MB
            </span>
          </div>
        )}

        {/* Real-Time Migration Progress Bar */}
        {isMigrating && progress && (
          <div className="p-4 rounded-xl bg-stone-900 text-white space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Migrating: {progress.itemTitle}</span>
              </span>
              <span className="font-mono text-stone-300">
                {progress.current} / {progress.total} ({progress.percent}%)
              </span>
            </div>

            <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-[10px] text-stone-400">
              Downloading &rarr; Converting to WebP &rarr; Saving to /assets/mirrored &rarr; Updating Database
            </p>
          </div>
        )}

        {/* Success Alert */}
        {migrationSummary && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <strong>Migration Complete:</strong> Successfully moved{' '}
              <span className="font-bold underline">{migrationSummary.migratedCount} images</span> to
              Cloudflare Pages Assets. Supabase Egress is now protected from quota limits.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
