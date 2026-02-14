'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface ChapterContent {
  content: string;
  title?: string;
}

export default function BookReader() {
  const searchParams = useSearchParams();
  const [content, setContent] = useState<ChapterContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const book_dir = searchParams.get('book_dir');
  const title = searchParams.get('title');
  const currentChapter = searchParams.get('chapter');

  useEffect(() => {
    if (!book_dir || !currentChapter) {
      setError('Missing book information');
      setIsLoading(false);
      return;
    }

    fetch(`/${book_dir}/${currentChapter}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load chapter');
        return res.text();
      })
      .then(data => {
        setContent({ content: data });
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [book_dir, currentChapter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-red-500">Error: {error}</div>
        <Link href="/" className="text-blue-500 hover:underline">
          Return to Book List
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          {title}
        </h1>
        
        <div 
          className="prose prose-lg max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: content?.content || '' }}
        />

        <div className="mt-8 border-t pt-4">
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Book List
          </Link>
        </div>
      </div>
    </div>
  );
}