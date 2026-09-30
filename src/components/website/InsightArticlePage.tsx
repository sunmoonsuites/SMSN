import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Hotel, InsightArticle } from '../../types';
import { getInsightArticles, getInsightBySlug } from '../../services/insightsService';
import { BASE_SITE_URL } from '../../lib/seoConfig';
import { formatDate, getCleanHotelPhone, getCleanHotelWhatsApp } from '../../lib/utils';
import {
  Calendar,
  Clock,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Phone,
  MessageCircle,
  MapPin,
  Tag,
  CheckCircle2,
} from 'lucide-react';

interface InsightArticlePageProps {
  hotel: Hotel | null;
  onOpenBooking: () => void;
}

export const InsightArticlePage: React.FC<InsightArticlePageProps> = ({
  hotel,
  onOpenBooking,
}) => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<InsightArticle | null>(null);
  const [related, setRelated] = useState<InsightArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const hotelName = hotel?.name || 'Sun Moon Suites';
  const phone = getCleanHotelPhone(hotel?.phone);
  const whatsappNumber = getCleanHotelWhatsApp(hotel?.whatsapp);
  const address = hotel?.address || 'GT-20, Sector 117';
  const city = hotel?.city || 'Noida';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadArticleData();
  }, [slug, hotel?.id]);

  const loadArticleData = async () => {
    setIsLoading(true);
    const hotelId = hotel?.id || 'default-hotel-id';
    const all = await getInsightArticles(hotelId, true);

    if (slug) {
      const found = await getInsightBySlug(slug, hotelId);
      setArticle(found);
      setRelated(all.filter((a) => a.slug !== slug).slice(0, 3));

      if (found && typeof document !== 'undefined') {
        const pageTitle = `${found.title} | ${hotelName} Sector 117 Noida`;
        const canonicalUrl = `${BASE_SITE_URL}/insights/${found.slug}`;
        document.title = pageTitle;

        const setMeta = (selector: string, val: string) => {
          const el = document.querySelector(selector);
          if (el) el.setAttribute('content', val);
        };
        setMeta('meta[name="description"]', found.excerpt);
        setMeta('meta[property="og:title"]', pageTitle);
        setMeta('meta[property="og:description"]', found.excerpt);
        setMeta('meta[property="og:url"]', canonicalUrl);
        const canonicalEl = document.querySelector('link[rel="canonical"]');
        if (canonicalEl) canonicalEl.setAttribute('href', canonicalUrl);
      }
    } else {
      setArticle(null);
      setRelated(all);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-stone-600">
        Loading Noida Insights &amp; Travel Guide...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="py-20 max-w-4xl mx-auto px-4 text-center space-y-4">
        <h1 className="font-serif text-3xl font-bold text-stone-900">
          Noida Travel Insights &amp; Local Guides
        </h1>
        <p className="text-sm text-stone-600">
          Select an article below to explore local events, metro travel tips, and stay guides around Sector 117 Noida.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 text-left">
          {related.map((item) => (
            <Link
              key={item.id}
              to={`/insights/${item.slug}`}
              className="p-5 bg-white rounded-xl border border-stone-200 hover:border-amber-700 transition-all space-y-2"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                {item.category}
              </span>
              <h2 className="font-serif font-bold text-base text-stone-900">{item.title}</h2>
              <p className="text-xs text-stone-600 line-clamp-2">{item.excerpt}</p>
            </Link>
          ))}
        </div>
        <div className="pt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white text-xs font-semibold uppercase tracking-wider rounded-lg"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Homepage</span>
          </Link>
        </div>
      </div>
    );
  }

  const canonicalUrl = `${BASE_SITE_URL}/insights/${article.slug}`;
  const articleSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: article.title,
        description: article.excerpt,
        image: article.cover_image,
        datePublished: article.published_at,
        dateModified: article.updated_at || article.published_at,
        author: {
          '@type': 'Organization',
          name: article.author || hotelName,
          url: `${BASE_SITE_URL}/`,
        },
        publisher: {
          '@type': 'Hotel',
          name: hotelName,
          url: `${BASE_SITE_URL}/`,
          address: {
            '@type': 'PostalAddress',
            streetAddress: address,
            addressLocality: city,
            addressRegion: 'Uttar Pradesh',
            postalCode: '201316',
            addressCountry: 'IN',
          },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Sun Moon Suites Home',
            item: `${BASE_SITE_URL}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Noida Insights & Guides',
            item: `${BASE_SITE_URL}/#insights`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: article.title,
            item: canonicalUrl,
          },
        ],
      },
    ],
  };

  // Parse content blocks cleanly (supports ## H2 headings, - bullet items, and paragraphs)
  const blocks = article.content.split(/\n\n+/);

  return (
    <div className="bg-stone-50 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Breadcrumb Bar */}
      <nav
        aria-label="Breadcrumb"
        className="bg-stone-100 border-b border-stone-200 py-2.5 px-4 sm:px-6 lg:px-8 text-xs text-stone-600"
      >
        <div className="max-w-6xl mx-auto flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="hover:text-amber-800 font-medium">
            Sun Moon Suites Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
          <Link to="/#insights" className="hover:text-amber-800 font-medium">
            Noida Insights
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
          <span className="text-stone-900 font-semibold line-clamp-1">{article.title}</span>
        </div>
      </nav>

      {/* Article Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Main Article Column */}
          <article className="lg:col-span-8 bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="relative h-64 sm:h-96 bg-stone-200">
              <img
                src={article.cover_image}
                alt={
                  article.image_alt ||
                  `${article.title} — ${hotelName} hotel in Sector 117 Noida`
                }
                width={1000}
                height={600}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-4 left-4 px-3.5 py-1 rounded-full bg-stone-900/90 text-amber-300 text-xs font-bold uppercase tracking-wider">
                {article.category}
              </span>
            </div>

            <div className="p-6 sm:p-10 space-y-6">
              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                  Published {formatDate(article.published_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                  {article.read_time}
                </span>
                <span>By {article.author}</span>
              </div>

              <h1 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 leading-tight">
                {article.title}
              </h1>

              <p className="text-base text-stone-700 font-medium leading-relaxed border-l-4 border-amber-700 pl-4 bg-amber-50/50 py-2 rounded-r-lg">
                {article.excerpt}
              </p>

              <div className="space-y-4 text-sm sm:text-base text-stone-700 leading-relaxed pt-2">
                {blocks.map((block, idx) => {
                  const trimmed = block.trim();
                  if (!trimmed) return null;
                  if (trimmed.startsWith('## ')) {
                    return (
                      <h2
                        key={idx}
                        className="font-serif text-xl sm:text-2xl font-bold text-stone-900 pt-4"
                      >
                        {trimmed.replace(/^##\s+/, '')}
                      </h2>
                    );
                  }
                  const lines = trimmed.split('\n');
                  const bulletLines = lines.filter((l) => l.trim().startsWith('- '));
                  if (bulletLines.length > 0 && bulletLines.length === lines.length) {
                    return (
                      <ul key={idx} className="space-y-2.5 pl-1">
                        {bulletLines.map((b, bIdx) => (
                          <li
                            key={bIdx}
                            className="flex items-start gap-2.5 text-sm text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-200/80"
                          >
                            <CheckCircle2
                              className="w-4 h-4 text-amber-700 shrink-0 mt-0.5"
                              aria-hidden="true"
                            />
                            <span>{b.replace(/^- /, '')}</span>
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={idx}>{trimmed}</p>;
                })}
              </div>

              {article.tags && article.tags.length > 0 && (
                <div className="pt-6 border-t border-stone-200 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Topics:
                  </span>
                  {article.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-xs text-stone-700 font-medium"
                    >
                      <Tag className="w-3 h-3 text-amber-700" aria-hidden="true" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>

          {/* Direct Booking & Local Guide Sidebar */}
          <aside className="lg:col-span-4 space-y-6 sticky top-24">
            <div className="bg-stone-900 text-white p-6 rounded-2xl space-y-4 shadow-md">
              <span className="text-[11px] uppercase tracking-widest text-amber-400 font-bold">
                Direct Booking Guarantee
              </span>
              <h2 className="font-serif text-2xl font-bold">
                Stay at {hotelName} in Sector 117 Noida
              </h2>
              <p className="text-xs text-stone-300 leading-relaxed">
                30 air-conditioned boutique rooms across 3 elevator-connected floors at {address}, {city}. Free high-speed Wi-Fi, 100% power backup, and free on-site parking.
              </p>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={onOpenBooking}
                  className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Check Room Availability</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>

                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                  <span>Call Desk: {phone}</span>
                </a>

                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>WhatsApp Enquiry</span>
                </a>
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-start gap-2 text-[11px] text-stone-400">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{address}, {city}, Uttar Pradesh 201316</span>
              </div>
            </div>

            {/* Related Articles */}
            {related.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
                <h3 className="font-serif font-bold text-stone-900 text-base">
                  More Noida Travel Insights
                </h3>
                <div className="space-y-3">
                  {related.map((rel) => (
                    <Link
                      key={rel.id}
                      to={`/insights/${rel.slug}`}
                      className="block p-3 rounded-xl bg-stone-50 hover:bg-amber-50/60 border border-stone-200/80 transition-colors space-y-1"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        {rel.category}
                      </span>
                      <h4 className="font-serif font-bold text-xs text-stone-900 line-clamp-2">
                        {rel.title}
                      </h4>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};
