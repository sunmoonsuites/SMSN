import React, { useEffect, useState } from 'react';
import { Hotel, InsightArticle, InsightCategory, InsightsConfig } from '../../types';
import {
  getInsightArticles,
  saveInsightArticle,
  deleteInsightArticle,
  uploadInsightCoverImage,
  slugifyTitle,
} from '../../services/insightsService';
import { updateHotel, DEFAULT_INSIGHTS_CONFIG } from '../../services/hotelService';
import { formatDate } from '../../lib/utils';
import {
  Plus,
  Edit3,
  Trash2,
  BookOpen,
  Upload,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Check,
  Database,
  Settings,
  Save,
} from 'lucide-react';
import { Modal } from '../common/Modal';

interface InsightsManagementViewProps {
  hotel: Hotel | null;
}

const CATEGORIES: InsightCategory[] = [
  'Local Events',
  'Travel Tips',
  'Hotel News',
  'Noida Guide',
];

const SUPABASE_INSIGHTS_SQL = `CREATE TABLE IF NOT EXISTS public.insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Noida Guide',
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  image_alt TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT 'Sun Moon Suites Editorial Desk',
  read_time TEXT NOT NULL DEFAULT '4 min read',
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to insights" ON public.insights;
CREATE POLICY "Allow all access to insights" ON public.insights FOR ALL USING (true) WITH CHECK (true);
INSERT INTO storage.buckets (id, name, public) VALUES ('insights', 'insights', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public Access Insights Bucket" ON storage.objects;
CREATE POLICY "Public Access Insights Bucket" ON storage.objects FOR ALL USING (bucket_id = 'insights') WITH CHECK (bucket_id = 'insights');`;

export const InsightsManagementView: React.FC<InsightsManagementViewProps> = ({ hotel }) => {
  const [activeSubTab, setActiveSubTab] = useState<'articles' | 'settings'>('articles');
  const [articles, setArticles] = useState<InsightArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingArticle, setEditingArticle] = useState<InsightArticle | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);

  // Website Section Visibility & Details state (Same as Banquet Hall)
  const currentInsightsConfig = hotel?.insights_config || DEFAULT_INSIGHTS_CONFIG;
  const [isSectionEnabled, setIsSectionEnabled] = useState(
    currentInsightsConfig.is_enabled !== false
  );
  const [sectionTitle, setSectionTitle] = useState(
    currentInsightsConfig.title || 'Local Insights, Events & Travel Tips'
  );
  const [sectionSubtitle, setSectionSubtitle] = useState(
    currentInsightsConfig.subtitle || 'Noida Travel & Hospitality Guide'
  );
  const [sectionDescription, setSectionDescription] = useState(
    currentInsightsConfig.description ||
      'Explore helpful guides on local events in Noida, metro connectivity, medical stay tips, and hospitality updates from Sun Moon Suites in Sector 117.'
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // Article Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<InsightCategory>('Local Events');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [author, setAuthor] = useState('Sun Moon Suites Editorial Desk');
  const [readTime, setReadTime] = useState('4 min read');
  const [tagsInput, setTagsInput] = useState('Sector 117 Noida, Sun Moon Suites Noida');
  const [isPublished, setIsPublished] = useState(true);

  const hotelId = hotel?.id || 'default-hotel-id';

  useEffect(() => {
    loadArticles();
  }, [hotelId]);

  useEffect(() => {
    if (hotel?.insights_config) {
      setIsSectionEnabled(hotel.insights_config.is_enabled !== false);
      setSectionTitle(hotel.insights_config.title || 'Local Insights, Events & Travel Tips');
      setSectionSubtitle(hotel.insights_config.subtitle || 'Noida Travel & Hospitality Guide');
      setSectionDescription(
        hotel.insights_config.description ||
          'Explore helpful guides on local events in Noida, metro connectivity, medical stay tips, and hospitality updates from Sun Moon Suites in Sector 117.'
      );
    }
  }, [hotel?.insights_config]);

  const loadArticles = async () => {
    setIsLoading(true);
    const data = await getInsightArticles(hotelId, false);
    setArticles(data);
    setIsLoading(false);
  };

  const handleQuickToggleVisibility = async () => {
    const nextEnabled = !isSectionEnabled;
    setIsSectionEnabled(nextEnabled);
    const newConfig: InsightsConfig = {
      is_enabled: nextEnabled,
      title: sectionTitle,
      subtitle: sectionSubtitle,
      description: sectionDescription,
    };
    await updateHotel(hotelId, { insights_config: newConfig });
    setStatusMessage(
      nextEnabled
        ? 'Insights section & menu link are now VISIBLE on the website!'
        : 'Insights section & menu link are now HIDDEN from the public website!'
    );
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleSaveSectionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    const newConfig: InsightsConfig = {
      is_enabled: isSectionEnabled,
      title: sectionTitle,
      subtitle: sectionSubtitle,
      description: sectionDescription,
    };
    await updateHotel(hotelId, { insights_config: newConfig });
    setIsSavingSettings(false);
    setSaveSettingsSuccess(true);
    setTimeout(() => setSaveSettingsSuccess(false), 3000);
  };

  const openCreateModal = () => {
    setEditingArticle(null);
    setTitle('');
    setSlug('');
    setCategory('Local Events');
    setExcerpt('');
    setContent('');
    setCoverImage(
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80'
    );
    setImageAlt('');
    setAuthor('Sun Moon Suites Editorial Desk');
    setReadTime('4 min read');
    setTagsInput('Sector 117 Noida, Sun Moon Suites Noida, Noida Travel Tips');
    setIsPublished(true);
    setShowEditor(true);
  };

  const openEditModal = (item: InsightArticle) => {
    setEditingArticle(item);
    setTitle(item.title);
    setSlug(item.slug);
    setCategory(item.category);
    setExcerpt(item.excerpt);
    setContent(item.content);
    setCoverImage(item.cover_image);
    setImageAlt(item.image_alt);
    setAuthor(item.author || 'Sun Moon Suites Editorial Desk');
    setReadTime(item.read_time || '4 min read');
    setTagsInput((item.tags || []).join(', '));
    setIsPublished(item.is_published !== false);
    setShowEditor(true);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const url = await uploadInsightCoverImage(file);
      setCoverImage(url);
      if (!imageAlt.trim() && title.trim()) {
        setImageAlt(`${title.trim()} — Sun Moon Suites hotel in Sector 117 Noida`);
      }
    } catch (err) {
      console.warn('Cover image upload failed:', err);
    }
    setIsUploadingImage(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !excerpt.trim() || !content.trim() || !coverImage.trim()) return;

    setIsSaving(true);
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await saveInsightArticle({
      id: editingArticle?.id,
      hotel_id: hotelId,
      title: title.trim(),
      slug: slug.trim() || slugifyTitle(title),
      category,
      excerpt: excerpt.trim(),
      content: content.trim(),
      cover_image: coverImage.trim(),
      image_alt:
        imageAlt.trim() || `${title.trim()} — Sun Moon Suites hotel in Sector 117 Noida`,
      author: author.trim() || 'Sun Moon Suites Editorial Desk',
      read_time: readTime.trim() || '4 min read',
      tags: parsedTags,
      is_published: isPublished,
      is_featured: true,
      published_at: editingArticle?.published_at || new Date().toISOString(),
    });

    setIsSaving(false);
    if (res.success) {
      setShowEditor(false);
      await loadArticles();
      setStatusMessage(
        res.syncedToSupabase
          ? 'Article saved & synced to Supabase Cloud Database!'
          : 'Article saved locally!'
      );
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteInsightArticle(id, hotelId);
    await loadArticles();
    setStatusMessage('Article deleted from website and Supabase.');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_INSIGHTS_SQL);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header (Same design as Banquet Hall & Events) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-serif font-bold text-2xl text-stone-900 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-800" />
              Noida Insights &amp; Blog
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isSectionEnabled
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              {isSectionEnabled
                ? '● Visible on Website'
                : '○ Hidden from Website (Non-Operational)'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Publish articles about local events in Noida, travel tips, and hotel news, or hide/unhide the Insights menu &amp; section on the website
          </p>
        </div>

        {/* Sub-tabs (Same as Banquet Hall) */}
        <div className="flex bg-stone-200/80 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSubTab('articles')}
            className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'articles'
                ? 'bg-white text-stone-900 shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            SEO Articles ({articles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'settings'
                ? 'bg-white text-stone-900 shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            Website Section Details
          </button>
        </div>
      </div>

      {/* Hidden Status Banner (Same as Banquet Hall) */}
      {!isSectionEnabled && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <BookOpen className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Noida Insights &amp; Blog is Currently Hidden on the Website:</span>
            <p className="text-[11px] text-amber-800">
              The Insights section on the homepage and the &quot;Insights&quot; link in the navigation menu and footer are hidden from visitors, while individual SEO article URLs remain accessible for Google indexing. You can re-enable it anytime using the toggle below or under <strong>Website Section Details</strong>.
            </p>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {activeSubTab === 'articles' && (
        <div className="space-y-6">
          {/* Quick Website Visibility Toggle + Action Bar */}
          <div
            className={`p-4 rounded-xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
              isSectionEnabled
                ? 'bg-emerald-50/50 border-emerald-300'
                : 'bg-rose-50/50 border-rose-300'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-stone-900">
                  Show Insights Section &amp; Menu on Website
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isSectionEnabled
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-rose-200 text-rose-900'
                  }`}
                >
                  {isSectionEnabled ? 'Visible on Website' : 'Hidden from Website'}
                </span>
              </div>
              <p className="text-xs text-stone-600">
                {isSectionEnabled
                  ? 'The Insights section and "Insights" link in the top navbar & footer are currently VISIBLE to website visitors.'
                  : 'The Insights section and "Insights" menu link are currently HIDDEN from website visitors (SEO article URLs stay active in the background for Google).'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-stone-200">
                <button
                  type="button"
                  onClick={handleQuickToggleVisibility}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isSectionEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isSectionEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="font-bold text-xs text-stone-800">
                  {isSectionEnabled ? 'Show on Website' : 'Hide from Website'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopySql}
                className="px-3.5 py-2 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                title="Copy SQL to create dedicated public.insights table & storage bucket in Supabase SQL Editor"
              >
                {sqlCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Insights SQL Copied!</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 text-amber-700" />
                    <span>Copy Supabase Table SQL</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Insight Article</span>
              </button>
            </div>
          </div>

          {/* Articles List */}
          {isLoading ? (
            <div className="p-12 text-center text-sm text-stone-500 bg-white rounded-xl border border-stone-200">
              Loading articles from Supabase...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <div
              key={article.id}
              className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 bg-stone-100">
                  <img
                    src={article.cover_image}
                    alt={article.image_alt || article.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-stone-900/85 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                      {article.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        article.is_published
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-600 text-stone-200'
                      }`}
                    >
                      {article.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <div className="text-[11px] text-stone-500 flex items-center justify-between">
                    <span>{formatDate(article.published_at)}</span>
                    <span>{article.read_time}</span>
                  </div>
                  <h3 className="font-serif font-bold text-base text-stone-900 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-xs text-stone-600 line-clamp-2">{article.excerpt}</p>
                  <p className="text-[11px] font-mono text-stone-400 truncate">
                    /insights/{article.slug}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
                <a
                  href={`/insights/${article.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-amber-800 hover:underline inline-flex items-center gap-1"
                >
                  <span>View Live</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(article)}
                    className="px-3 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(article.id)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-rose-700 cursor-pointer"
                    title="Delete Article"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-4">
            <div>
              <h4 className="font-serif font-bold text-base text-stone-900">
                Noida Insights &amp; Blog Website Visibility &amp; Details
              </h4>
              <p className="text-xs text-stone-500">
                Show or hide the Insights section &amp; menu link from website visitors, or customize headings and descriptions.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSectionSettings} className="space-y-5 text-xs">
            {/* Website Visibility Toggle Card (Same as Banquet Hall) */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                isSectionEnabled
                  ? 'bg-emerald-50/50 border-emerald-300'
                  : 'bg-rose-50/50 border-rose-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-stone-900">
                      Show Insights Section on Website (Operational Status)
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isSectionEnabled
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {isSectionEnabled ? 'Operational (Visible)' : 'Non-Operational (Hidden)'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">
                    {isSectionEnabled
                      ? 'The Insights section on the homepage and the "Insights" link in the navigation bar & footer are currently VISIBLE on the website.'
                      : 'The Insights section and "Insights" navbar link are currently HIDDEN from the public website (individual SEO article pages remain active for Google).'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSectionEnabled(!isSectionEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isSectionEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isSectionEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="font-bold text-xs text-stone-800">
                    {isSectionEnabled ? 'Show on Website' : 'Hide from Website'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-stone-700 mb-1 uppercase tracking-wider">
                  Section Title
                </label>
                <input
                  type="text"
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm"
                  placeholder="Local Insights, Events & Travel Tips"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1 uppercase tracking-wider">
                  Section Subtitle / Badge
                </label>
                <input
                  type="text"
                  value={sectionSubtitle}
                  onChange={(e) => setSectionSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm"
                  placeholder="Noida Travel & Hospitality Guide"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1 uppercase tracking-wider">
                Section Description
              </label>
              <textarea
                rows={3}
                value={sectionDescription}
                onChange={(e) => setSectionDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-stone-300 rounded-lg text-sm"
                placeholder="Explore helpful guides on local events in Noida, metro connectivity, medical stay tips, and hospitality updates..."
              />
            </div>

            <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
              <div>
                {saveSettingsSuccess && (
                  <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Insights website settings saved to Supabase!
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-bold uppercase tracking-wider rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isSavingSettings ? 'Saving...' : 'Save Insights Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showEditor}
        onClose={() => setShowEditor(false)}
        title={editingArticle ? 'Edit Insight Article' : 'Publish New Insight Article'}
        subtitle="Articles are indexed by Google & AI search with automatic Schema.org BlogPosting markup."
        maxWidth="3xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                Article Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!editingArticle) {
                    setSlug(slugifyTitle(e.target.value));
                  }
                }}
                placeholder="e.g. Best Places to Visit Near Sector 117 Noida"
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InsightCategory)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                SEO URL Slug
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(slugifyTitle(e.target.value))}
                placeholder="auto-generated-from-title"
                className="w-full px-3 py-2 text-xs font-mono border border-stone-300 rounded-lg bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                Read Time
              </label>
              <input
                type="text"
                value={readTime}
                onChange={(e) => setReadTime(e.target.value)}
                placeholder="4 min read"
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
              Short Summary / Meta Description (Excerpt) *
            </label>
            <textarea
              rows={2}
              required
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="1-2 sentence summary shown on article cards and in Google search results..."
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
              Full Article Content * (Use &apos;## Heading&apos; for H2 subheadings &amp; &apos;- item&apos; for bullet points)
            </label>
            <textarea
              rows={8}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Write helpful local Noida travel tips or event news...\n\n## Section Heading\nParagraph text...\n\n- Helpful point 1\n- Helpful point 2`}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                Cover Image (Upload to Supabase or Paste URL) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-lg"
                />
                <label className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingImage ? 'Uploading...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                Image SEO ALT Attribute
              </label>
              <input
                type="text"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="Descriptive alt text with Sector 117 Noida / Sun Moon Suites"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                SEO Topic Tags (Comma Separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Sector 117 Noida, Medanta Hospital Noida, Travel Tips"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
              />
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => setIsPublished(!isPublished)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border cursor-pointer ${
                  isPublished
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-stone-100 border-stone-300 text-stone-700'
                }`}
              >
                {isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span>
                  {isPublished ? 'Published (Visible on Website)' : 'Draft (Hidden on Website)'}
                </span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowEditor(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-xs cursor-pointer"
            >
              {isSaving ? 'Saving to Supabase...' : editingArticle ? 'Update Article' : 'Publish Article'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
