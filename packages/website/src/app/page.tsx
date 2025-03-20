'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Reader } from '@easy-reading/shared';
import type { Article } from '@easy-reading/shared';
import { useArticleExtractor } from '@/hooks/useArticleExtractor';
import { UrlForm } from '@/components/UrlForm';
import { useSearchParams } from 'next/navigation';

function UrlReaderContent() {
  const [url, setUrl] = useState('');
  const [article, setArticle] = useState<Article | null>(null);
  const { extractArticle, loading, error } = useArticleExtractor();
  const searchParams = useSearchParams();

  // Handle URL from query parameter
  useEffect(() => {
    const urlParam = searchParams.get('url');
    if (urlParam) {
      setUrl(urlParam);
      extractArticle(urlParam).then(data => {
        if (data) {
          console.log("extract artile title: ", data.title)
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
      setArticle(data);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('url', url);
      window.history.pushState({}, '', newUrl.toString());      
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {!article ? (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-4xl mx-auto">
            <UrlForm
              url={url}
              onUrlChange={setUrl}
              onSubmit={handleSubmit}
              loading={loading}
            />
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 max-w-2xl mx-auto">
                {error}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-6">
          <Reader article={article} />
        </div>
      )}
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
export default function UrlReaderPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UrlReaderContent />
    </Suspense>
  );
}