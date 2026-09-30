import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Hotel, InsightArticle } from '../../types';
import { getInsightArticles, DEFAULT_INSIGHT_ARTICLES } from '../../services/insightsService';
import { DEFAULT_INSIGHTS_CONFIG } from '../../services/hotelService';
import { Calendar, Clock, ArrowRight, BookOpen, Tag } from 'lucide-react';
import { formatDate } from '../../lib/utils';

interface InsightsSectionProps {
  hotel: Hotel | null;
}

export const InsightsSection: React.FC<InsightsSectionProps> = ({ hotel }) => {
  const insightsConfig = hotel?.insights_config || DEFAULT_INSIGHTS_CONFIG;

  const [articles, setArticles] = useState<InsightArticle[]>(
    DEFAULT_INSIGHT_ARTICLES.filter((a) => a.is_published)
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    loadInsights();
  }, [hotel?.id]);

  const loadInsights = async () => {
    const data = await getInsightArticles(hotel?.id || 'default-hotel-id', true);
    if (data && data.length > 0) {
      setArticles(data);
    }
  };

  if (insightsConfig.is_enabled === false || articles.length === 0) {
    return null;
  }

  const categories = ['All', ...Array.from(new Set(articles.map((a) => a.category)))];
  const filtered =
    selectedCategory === 'All'
      ? articles
      : articles.filter((a) => a.category === selectedCategory);

  const hotelName = hotel?.name || 'Sun Moon Suites';

  return (
    <section id="insights" className="py-20 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <span className="text-xs uppercase tracking-widest text-amber-800 font-bold inline-flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{insightsConfig.subtitle || 'Noida Travel & Hospitality Guide'}</span>
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            {insightsConfig.title || 'Local Insights, Events & Travel Tips'}
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            {insightsConfig.description ||
              `Explore helpful guides on local events in Noida, metro connectivity, medical stay tips, and hospitality updates from ${hotelName} in Sector 117.`}
          </p>
        </div>

        {/* Category Filter Tabs */}
        {categories.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((article) => {
            const altText =
              article.image_alt?.trim() ||
              `${article.title} — ${hotelName} hotel in Sector 117 Noida`;

            return (
              <article
                key={article.id}
                className="bg-stone-50/70 rounded-2xl border border-stone-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <Link
                    to={`/insights/${article.slug}`}
                    className="block relative h-52 bg-stone-200 overflow-hidden"
                  >
                    <img
                      src={article.cover_image}
                      alt={altText}
                      width={600}
                      height={400}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-stone-900/85 backdrop-blur-xs text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                      {article.category}
                    </span>
                  </Link>

                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-4 text-[11px] text-stone-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                        {formatDate(article.published_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                        {article.read_time}
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-amber-800 transition-colors leading-snug">
                      <Link to={`/insights/${article.slug}`}>{article.title}</Link>
                    </h3>

                    <p className="text-xs text-stone-600 leading-relaxed line-clamp-3">
                      {article.excerpt}
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-2 space-y-4">
                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {article.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-stone-200 text-[10px] text-stone-600 font-medium"
                        >
                          <Tag className="w-2.5 h-2.5 text-amber-700" aria-hidden="true" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-stone-200/80 flex items-center justify-between">
                    <span className="text-[11px] text-stone-500 font-medium">
                      By {article.author}
                    </span>
                    <Link
                      to={`/insights/${article.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-800 hover:text-amber-950 transition-colors"
                    >
                      <span>Read Guide</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
