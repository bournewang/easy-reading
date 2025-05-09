'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Reader } from '@easy-reading/shared';
import type { Article } from '@easy-reading/shared';
import { useArticleExtractor } from '@/hooks/useArticleExtractor';
import { UrlForm } from '@/components/UrlForm';
import { useSearchParams } from 'next/navigation';
import { useArticles } from '@/hooks/useArticles';
import type { FeaturedArticle } from '@/data/articles';
import { getArticleStorageKey } from '@/utils/storage';
import Link from 'next/link';

const backgroundColors = {
  general: '#3B82F6',
  culture: '#8B5CF6',
  travel: '#10B981',
  arts: '#F59E0B',
  business: '#F59E0B',
  earth: '#F59E0B'
};

function FeaturedArticleCard({ article }: { article: FeaturedArticle }) {
  return (
    <Link href={`/?url=${encodeURIComponent(article.url)}`} className="block">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        {article.imageUrl && (
          <img 
            src={`${process.env.NEXT_PUBLIC_IMAGE_LOADER_URL}?url=${article.imageUrl}`} 
            alt={article.title} 
            className="w-full h-48 object-cover"
          />
        )}
        <div className="p-4">
          <span className="inline-block px-2 py-1 text-sm font-semibold rounded-full text-white mb-2"
                style={{ backgroundColor: backgroundColors[article.category] }}>
            {article.category}
          </span>
          <h3 className="text-xl font-bold mb-2">{article.title}</h3>
          <p className="text-gray-600">{article.description}</p>
        </div>
      </div>
    </Link>
  );
}

function UrlReaderContent() {
  const [url, setUrl] = useState('');
  const [article, setArticle] = useState<Article | null>(null);
  const [showMarkAsRead, setShowMarkAsRead] = useState(false);
  const { extractArticle, loading: extractLoading, error: extractError } = useArticleExtractor();
  const { articles: featuredArticles, loading: articlesLoading } = useArticles();
  const searchParams = useSearchParams();
  const [isRead, setIsRead] = useState(false);

  // Add scroll handler
  useEffect(() => {
    if (!article) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      setShowMarkAsRead(scrollPosition >= documentHeight - 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [article]);

  // Check if article is marked as read
  useEffect(() => {
    if (article?.url) {
      const readArticles = JSON.parse(localStorage.getItem('readArticles') || '[]');
      setIsRead(readArticles.includes(article.url));
    }
  }, [article?.url]);

  // Handle marking article as read
  const handleMarkAsRead = () => {
    if (article?.url) {
      const readArticles = JSON.parse(localStorage.getItem('readArticles') || '[]');
      if (!readArticles.includes(article.url)) {
        readArticles.push(article.url);
        localStorage.setItem('readArticles', JSON.stringify(readArticles));
        
        localStorage.setItem(getArticleStorageKey(article.url), JSON.stringify({
          title: article.title,
          site_name: article.site_name,
          url: article.url,
          reading_time: article.reading_time,
          word_count: article.word_count,
          timestamp: Date.now(),
        }));
        setIsRead(true);
      }
    }
  };

  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam) {
      setUrl(urlParam);
      extractArticle(urlParam).then(data => {
        if (data) {
          if (data.reading_time == undefined || !data.reading_time) {
            data.reading_time = Math.ceil(data.word_count / 150);
          }          
          setArticle(data);
        }
      });
    }
  }, [searchParams, extractArticle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const data = await extractArticle(url);
    if (data) {
      if (data.reading_time == undefined || !data.reading_time) {
        data.reading_time = Math.ceil(data.word_count / 150);
      }
      setArticle(data);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('url', url);
      window.history.pushState({}, '', newUrl.toString());      
    }
  };

  // Get latest 3 articles for the featured section
  const latestArticles = featuredArticles.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {!article ? (
        <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-6">
            {/* <h1 className="text-5xl font-bold mb-4">Easy Reading</h1> */}
            <p className="text-xl text-gray-600 mb-8">
              Transform any article into a clean, distraction-free reading experience.
              Perfect for language learners and focused readers.
            </p>
          </div>
          
          {/* URL Input Form */}
          <div className="max-w-2xl mx-auto mb-6">
            <UrlForm
              url={url}
              onUrlChange={setUrl}
              onSubmit={handleSubmit}
              loading={extractLoading}
            />
            {extractError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                {extractError}
              </div>
            )}
          </div>

          {/* Get Started Section */}
          {/* <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Get Started</h2>
            <p className="text-gray-600 mb-8 mx-auto">
              Simply paste any article URL above to start reading. Our tool will extract the content
              and present it in a clean, distraction-free format, perfect for language learning
              and focused reading.
            </p>
          </div>*/}

          {/* Featured Articles Section */}
          <div className="mb-16">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Featured Articles</h2>
              <Link href="/news" className="text-blue-600 hover:text-blue-800">
                View all articles →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {latestArticles.map((article) => (
                <FeaturedArticleCard key={article.url} article={article} />
              ))}
            </div>
          </div>

        </div>
      ) : (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-4">
              <button
                onClick={() => {
                  setArticle(null);
                  const newUrl = new URL(window.location.href);
                  newUrl.searchParams.delete('url');
                  window.history.pushState({}, '', newUrl.toString());
                }}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </button>
            </div>
            <Reader article={article} />
            {showMarkAsRead && !isRead && (
              <button
                onClick={handleMarkAsRead}
                className="fixed bottom-8 right-8 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
              >
                Mark as Read
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UrlReaderContent />
    </Suspense>
  );
}