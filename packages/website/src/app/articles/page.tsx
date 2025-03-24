'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Article } from '@easy-reading/shared';
import { urlHash } from '@/utils/storage';
import { BookIcon, ClockIcon, Paginator } from '@easy-reading/shared';

interface ReadArticle extends Article {
  timestamp: number;
}

const ITEMS_PER_PAGE = 10;

export default function ArticleListPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [articles, setArticles] = useState<ReadArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(articles.length / ITEMS_PER_PAGE);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Get read articles from localStorage
    const readArticles = JSON.parse(localStorage.getItem('readArticles') || '[]');
    const articleDetails = readArticles.map((url: string) => {
      const details = JSON.parse(localStorage.getItem(`article_${urlHash(url)}`) || '{}');
      return {
        url,
        title: details.title || 'Untitled Article',
        site_name: details.site_name || 'Unknown Site',
        reading_time: details.reading_time || 0,
        word_count: details.word_count || 0,
        timestamp: details.timestamp || 0,
      };
    });

    // Sort articles by timestamp (newest first)
    articleDetails.sort((a: ReadArticle, b: ReadArticle) => b.timestamp - a.timestamp);
    setArticles(articleDetails);
    setLoading(false);
  }, [user, router]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getCurrentPageArticles = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return articles.slice(startIndex, endIndex);
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="p-4 bg-white rounded-lg shadow-md">
          <div className="animate-spin text-2xl">⏳</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">Reading History</h1>
          
          {articles.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">You haven't read any articles yet.</p>
              <Link 
                href="/"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
              >
                Start Reading
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {getCurrentPageArticles().map((article) => (
                  <div 
                    key={article.url}
                    className="border-b border-gray-200 last:border-0 pb-4 last:pb-0"
                  >
                    <Link 
                      href={`/?url=${encodeURIComponent(article.url)}`}
                      className="block hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                      <h2 className="text-lg font-semibold text-gray-900 mb-2">
                        {article.title}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                          </svg>
                          <span>{article.site_name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <BookIcon className="w-4 h-4" />
                          <span>{article.word_count.toLocaleString()} words</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="w-4 h-4" />
                          <span>{article.reading_time} min read</span>
                        </div>
                        <span>•</span>
                        <span>
                          Read on {new Date(article.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>

              <Paginator
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                className="mt-8"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
} 