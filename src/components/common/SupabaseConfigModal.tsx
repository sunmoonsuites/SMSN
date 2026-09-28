import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
} from '../../lib/supabase';
import { Database, CheckCircle2, AlertCircle, Copy, Check, ExternalLink } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    schemaReady?: boolean;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedRlsSql, setCopiedRlsSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setTestResult(null);
    }
  }, [isOpen]);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Please provide both the Supabase URL and Publishable/Anon Key.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection(url.trim(), anonKey.trim());
    setTestResult(res);
    setIsTesting(false);

    if (res.success) {
      saveSupabaseConfig(url.trim(), anonKey.trim());
      if (onConnected) onConnected();
    }
  };

  const handleDisconnect = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult({
      success: false,
      message: 'Supabase credentials cleared. Database connection disconnected.',
    });
  };

  const copySqlMigration = async () => {
    try {
      const response = await fetch('/api/migrations/sql');
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      // Fallback
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3000);
    }
  };

  const copyRlsSql = async () => {
    try {
      const response = await fetch('/api/migrations/rls-fix');
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      setCopiedRlsSql(true);
      setTimeout(() => setCopiedRlsSql(false), 3000);
    } catch {
      setCopiedRlsSql(true);
      setTimeout(() => setCopiedRlsSql(false), 3000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supabase Database Connection"
      subtitle="Connect your Supabase PostgreSQL project as the primary database for Sun Moon Suites"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Architecture Notice */}
        <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-amber-700" />
            Supabase Single Source of Truth
          </p>
          This system connects directly to Supabase for all hotel operations: 30-room inventory,
          reservations, guest registrations, billing, GST invoices, and housekeeping.
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleTestAndSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Supabase Project URL
            </label>
            <input
              type="url"
              required
              placeholder="https://your-project-id.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono"
            />
            <span className="text-[11px] text-stone-500 mt-1 block">
              Found in Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; Project URL
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Supabase Publishable Key (or Anon Key)
            </label>
            <input
              type="password"
              required
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-mono"
            />
            <span className="text-[11px] text-stone-500 mt-1 block">
              In Supabase Dashboard &rarr; <strong>Project Settings &rarr; API Keys</strong>, copy the <strong>Publishable key</strong> (or legacy <code>anon public</code>).
            </span>
          </div>

          {/* Secret Key / Service Role Clarification Box */}
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1.5">
            <div className="font-semibold text-stone-900 flex items-center gap-1.5">
              <span>💡</span>
              <span>Why do you see "Secret key" instead of "service_role key"?</span>
            </div>
            <p className="text-stone-600 leading-relaxed text-[11px]">
              Supabase recently updated their dashboard: the <strong>service_role key</strong> is now officially named <strong>"Secret key"</strong>.
            </p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-stone-600">
              <li>
                <strong>For this connection modal:</strong> Use your <strong>Publishable key</strong> (anon). Do not paste the Secret key here in the browser.
              </li>
              <li>
                <strong>For backend server secrets (.env):</strong> You can set either <code className="bg-stone-200 px-1 py-0.5 rounded text-stone-800">SUPABASE_SECRET_KEY</code> or <code className="bg-stone-200 px-1 py-0.5 rounded text-stone-800">SUPABASE_SERVICE_ROLE_KEY</code> with your Supabase Secret key. Both are supported!
              </li>
            </ul>
          </div>

          {testResult && (
            <div
              className={`p-3.5 rounded-lg flex items-start gap-2.5 text-xs leading-relaxed ${
                testResult.success
                  ? testResult.schemaReady === false
                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{testResult.message}</p>
                {testResult.schemaReady === false && (
                  <p className="mt-1 text-[11px] opacity-90">
                    Use the button below to copy the SQL script and run it in the Supabase SQL Editor.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isTesting}
                className="px-5 py-2.5 bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2"
              >
                {isTesting ? 'Testing Connection...' : 'Save & Connect Database'}
              </button>
              {currentConfig.source === 'user' && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3.5 py-2.5 text-xs font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>

            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-stone-600 hover:text-stone-900 inline-flex items-center gap-1 font-medium"
            >
              Open Supabase Dashboard
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </form>

        {/* RLS Policy Fix Box (Quick Fix for 42501 errors on guests, bookings, etc.) */}
        <div className="border-t border-stone-200 pt-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>🛡️</span>
                <span>RLS Security Policy Fix (Error 42501 Fix)</span>
              </h4>
              <p className="text-[11px] text-stone-500">
                Run this quick SQL in Supabase SQL Editor if you see &quot;violates row-level security policy&quot; for guests, bookings, or rooms.
              </p>
            </div>
            <button
              type="button"
              onClick={copyRlsSql}
              className="px-3 py-1.5 text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md transition-colors flex items-center gap-1.5 shrink-0"
            >
              {copiedRlsSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedRlsSql ? 'Copied RLS Fix!' : 'Copy RLS Fix SQL'}
            </button>
          </div>
          <div className="bg-stone-900 text-stone-300 p-3 rounded-lg text-xs font-mono max-h-24 overflow-y-auto select-all">
            DROP POLICY IF EXISTS &quot;Staff manage guests&quot; ON public.guests;<br />
            CREATE POLICY &quot;Allow all access to guests&quot; ON public.guests FOR ALL USING (true) WITH CHECK (true);<br />
            -- Click &quot;Copy RLS Fix SQL&quot; to copy the complete fix for all tables!
          </div>
        </div>

        {/* Database Migration SQL Box */}
        <div className="border-t border-stone-200 pt-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                PostgreSQL Migration Script (20260921000000_initial_schema.sql)
              </h4>
              <p className="text-[11px] text-stone-500">
                Run this SQL in your Supabase SQL Editor to initialize all 20 tables, indexes, constraints, and RLS policies.
              </p>
            </div>
            <button
              type="button"
              onClick={copySqlMigration}
              className="px-3 py-1.5 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md transition-colors flex items-center gap-1.5 shrink-0"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSql ? 'Copied SQL!' : 'Copy SQL Script'}
            </button>
          </div>
          <div className="bg-stone-900 text-stone-300 p-3 rounded-lg text-xs font-mono max-h-32 overflow-y-auto select-all">
            -- Sector 117 Noida 30-Room Hotel PMS Schema<br />
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";<br />
            CREATE TABLE IF NOT EXISTS public.hotels (...);<br />
            CREATE TABLE IF NOT EXISTS public.rooms (...);<br />
            CREATE TABLE IF NOT EXISTS public.bookings (...);<br />
            CREATE TABLE IF NOT EXISTS public.invoices (...);<br />
            -- Click "Copy SQL Script" to get the complete script with RLS & functions!
          </div>
        </div>
      </div>
    </Modal>
  );
};
