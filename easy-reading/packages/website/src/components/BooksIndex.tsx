'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Reader from '@easy-reading/shared/src/components/Reader';
import { useArticleExtractor } from '@/hooks/useArticleExtractor';
import type { Article } from '@easy-reading/shared';
import { ChapterSelector, MOBILE_SELECTOR_HEIGHT, DESKTOP_SELECTOR_HEIGHT } from './ChapterSelector';

// import './BooksIndex.css';

interface Chapter {
  title?: string;
  url: string;
}

interface Book {
  id: string;
  title: string;
  description?: string;  // optional
  author?: string;      // optional
  coverImg: string | null;
  book_dir: string;
  chapters: string[];
  original: string;
  vocabulary_level?: string;  // Optional field for reading level
}

interface BooksIndex {
  total: number;
  books: Book[];
}

const BooksIndex: React.FC = () => {
  const [booksData, setBooksData] = useState<BooksIndex | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const { extractArticle, loading: extractLoading, error: extractError } = useArticleExtractor();
  const [article, setArticle] = useState<Article | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentChapter, setCurrentChapter] = useState<number>(0);
  const [selectedGrade, setSelectedGrade] = useState<string>(() => {
    // Try to load from localStorage on initial render
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedGrade') || 'b11';
    }
    return 'b11';
  });

  // Save to localStorage whenever grade changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedGrade', selectedGrade);
    }
  }, [selectedGrade]);

  const grades = [
    // { id: 'all', label: 'All Levels', file: 'index.json' },
    { id: 'a1', label: 'A1 (500-1000 words)', file: 'index-a1.json' },
    { id: 'a2', label: 'A2 (1000-2000 words)', file: 'index-a2.json' },
    { id: 'b11', label: 'B1.1 (200-3000 words)', file: 'index-b11.json' },
    { id: 'b12', label: 'B1.2 (300-4000 words)', file: 'index-b12.json' },
    { id: 'b21', label: 'B2.1 (400-5000 words)', file: 'index-b21.json' },
    { id: 'b22', label: 'B2.2 (500-6000 words)', file: 'index-b22.json' },
    { id: 'c1', label: 'C1 (6000+ words)', file: 'index-c1.json' },
    // { id: 'advanced', label: 'Advanced (3000+ words)', file: 'advanced.json' }
  ];

  const fetchBooks = async (gradeId: string) => {
    setLoading(true);
    setError(null);
    try {
      const gradeFile = grades.find(g => g.id === gradeId)?.file || 'index.json';
      const response = await fetch(`/books/${gradeFile}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch books index: ${response.status}`);
      }
      const data = await response.json();
      setBooksData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchBooks('all');
  }, []);

  // Fetch books when grade changes
  useEffect(() => {
    fetchBooks(selectedGrade);
  }, [selectedGrade]);

  useEffect(() => {
    if (selectedBook) {
      const url = process.env.NEXT_PUBLIC_BOOKS_URL + selectedBook.book_dir + "/" + selectedBook.chapters[currentChapterIndex];
      console.log(url);
      extractArticle(url).then(data => {
        if (data) {
          if (data.reading_time == undefined || !data.reading_time) {
            data.reading_time = Math.ceil(data.word_count / 150);
          }          
          setArticle(data);
          // Reset scroll position to top when chapter changes
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  }, [selectedBook, extractArticle, currentChapterIndex]);  

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return <div className="books-error">Error: {error}</div>;
  }

  if (!booksData || !booksData.books || booksData.books.length === 0) {
    return <div className="books-empty">No books available</div>;
  }

  if (selectedBook) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Back to Library Button */}
        <div className="fixed top-12 left-4 z-10">
          <button
            onClick={() => {
              setSelectedBook(null);
              setCurrentChapterIndex(0);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg shadow-sm hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Library
          </button>
        </div>

        <div 
          className="mx-auto px-4 py-8 pb-[calc(120px+1rem)] sm:pb-[calc(144px+1rem)]">
          {article && <Reader article={article} />}
        </div>        
        
        {/* Replace the old chapter selector with the new component */}
        <ChapterSelector
          currentChapter={currentChapterIndex}
          totalChapters={selectedBook.chapters.length}
          onChapterChange={setCurrentChapterIndex}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">
            Books Library
            <span className="block text-sm font-normal text-gray-500 mt-2">
              Select a book to start reading
            </span>
          </h1>

          {/* Grade Selector */}
          <div className="flex flex-wrap gap-2">
            {grades.map((grade) => (
              <button
                key={grade.id}
                onClick={() => setSelectedGrade(grade.id)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                  selectedGrade === grade.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                } ${loading && selectedGrade === grade.id ? 'opacity-50 cursor-wait' : ''}`}
                disabled={loading && selectedGrade === grade.id}
              >
                {grade.label}
                {loading && selectedGrade === grade.id && (
                  <span className="ml-2 inline-block animate-spin">⟳</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-red-500 text-center py-8">
            Error: {error}
            <button 
              onClick={() => fetchBooks(selectedGrade)}
              className="block mx-auto mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Books Grid */}
        {!loading && !error && booksData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {booksData.books.map((book) => (
              <button
                key={book.book_dir}
                onClick={() => {
                  setCurrentChapter(0);
                  setSelectedBook(book);
                }}
                className="group bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="aspect-[3/4] mb-4 overflow-hidden rounded-lg">
                  {book.coverImg ? (
                    <img 
                      src={book.coverImg} 
                      alt={book.title}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                </div>
                <h2 className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                  {book.title}
                </h2>
                {book.author && (
                  <p className="text-sm text-gray-600 mt-1">
                    by {book.author}
                  </p>
                )}
                {book.vocabulary_level && (
                  <p className="text-xs text-gray-500 mt-2">
                    Level: {book.vocabulary_level}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {book.chapters.length} chapters
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BooksIndex;
