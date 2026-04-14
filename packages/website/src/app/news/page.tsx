'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useArticles } from '@/hooks/useArticles';
import type { FeaturedArticle } from '@/data/articles';

const backgroundColors = {
  general: '#3B82F6',
  culture: '#8B5CF6',
  travel: '#10B981',
  arts: '#F59E0B',
  business: '#F59E0B',
  earth: '#F59E0B'
}

function ArticleCard({ article, onClick }: { article: FeaturedArticle; onClick: () => void }) {
  const [isRead, setIsRead] = useState(false);

  useEffect(() => {
    const readArticles = JSON.parse(localStorage.getItem('readArticles') || '[]');
    setIsRead(readArticles.includes(article.url));
  }, [article.url]);

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer p-4 relative"
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-2">
          <span className="inline-block px-2 py-1 text-sm font-semibold rounded-full text-white"
                style={{ backgroundColor: backgroundColors[article.category] }}>
            {article.category}
          </span>
        </div>
        <h3 className="text-xl font-bold mb-2">{article.title}</h3>
        <p className="text-gray-600 flex-grow">{article.description}</p>
        {isRead && (
          <div className="absolute bottom-4 right-4 bg-green-500 text-white rounded-full p-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleCardWithImage({ article, onClick }: { article: FeaturedArticle; onClick: () => void }) {
  const [isRead, setIsRead] = useState(false);

  useEffect(() => {
    const readArticles = JSON.parse(localStorage.getItem('readArticles') || '[]');
    setIsRead(readArticles.includes(article.url));
  }, [article.url]);

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer relative"
      onClick={onClick}
    >
      <img 
        src={`${process.env.NEXT_PUBLIC_IMAGE_LOADER_URL}?url=${article.imageUrl}`} 
        alt={article.title} 
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="inline-block px-2 py-1 text-sm font-semibold rounded-full text-white"
                style={{ backgroundColor: backgroundColors[article.category] }}>
            {article.category}
          </span>
        </div>
        <h3 className="text-xl font-bold mb-2">{article.title}</h3>
        <p className="text-gray-600">{article.description}</p>
        {isRead && (
          <div className="absolute bottom-4 right-4 bg-green-500 text-white rounded-full p-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function UrlReaderContent() {
  const { articles: featuredArticles, loading: articlesLoading, error: articlesError } = useArticles();
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const router = useRouter();

  // Extract unique categories from articles
  const categories = ['all', ...new Set(featuredArticles.map(article => article.category))];

  const handleArticleClick = async (articleUrl: string) => {
    router.push(`/reader?url=${encodeURIComponent(articleUrl)}`);
  };

  // Filter articles based on category and search query
  const getFilteredAndSplitArticles = () => {
    let filtered = selectedCategory === 'all' 
      ? featuredArticles 
      : featuredArticles.filter(article => article.category === selectedCategory);

    // Apply search filter
    const searchQuery = searchParams.get('search') || '';
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(query) || 
        article.description.toLowerCase().includes(query)
      );
    }

    const withImages = filtered.filter(article => article.imageUrl);
    const withoutImages = filtered.filter(article => !article.imageUrl);

    return { featuredWithImages: withImages, remainingArticles: withoutImages };
  };

  const { featuredWithImages, remainingArticles } = getFilteredAndSplitArticles();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">BBC News</h1>
        {articlesLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : articlesError ? (
          <div className="text-center py-8 text-red-600">
            {articlesError}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <div className="flex gap-2 flex-wrap">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full capitalize text-sm ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="relative w-48">
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchParams.get('search') || ''}
                  onChange={(e) => {
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set('search', e.target.value);
                    window.history.pushState({}, '', newUrl.toString());
                  }}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {featuredWithImages.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {featuredWithImages.map(article => (
                  <ArticleCardWithImage
                    key={article.url}
                    article={article}
                    onClick={() => handleArticleClick(article.url)}
                  />
                ))}
              </div>
            )}

            {remainingArticles.length > 0 && (
              <>
                <h2 className="text-2xl font-semibold mb-4">More Articles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {remainingArticles.map(article => (
                    <ArticleCard
                      key={article.url}
                      article={article}
                      onClick={() => handleArticleClick(article.url)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="p-4 bg-white rounded-lg shadow-md">
        <div className="animate-spin text-2xl">⏳</div>
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function NewsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UrlReaderContent />
    </Suspense>
  );
}
