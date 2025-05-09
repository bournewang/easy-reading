'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Dictionary from './Dictionary';
import Tips from './Tips';
import { useTTS } from '../hooks/useTTS';
import { useTranslation } from '../hooks/useTranslation';
import { useWordList } from '../hooks/useWordList';
import type { Article } from '../types';
import { cleanWord } from '../utils/helper';
import { ChatWindow } from './ChatWindow';
import { InteractiveText } from './InteractiveText';
import { BookIcon, ClockIcon } from './icons/ReaderIcons';
import '../styles/tailwind.css';

export interface ReaderProps {
  article: Article;
}
const spinAnimation = `
  @keyframes spin-slow {from {transform: rotate(0deg);}to {transform: rotate(360deg);}}
  .animate-spin-slow {animation: spin-slow 2s linear infinite;}`;

const Reader: React.FC<ReaderProps> = ({ article }) => {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const { words, addWord, removeWord } = useWordList();
  const [showChat, setShowChat] = useState(false);
  const [visibleParagraphs, setVisibleParagraphs] = useState<Record<string, boolean>>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const paragraphRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Setup intersection observer to track which paragraphs are visible
  useEffect(() => {
    const observerOptions = {
      root: null, // use viewport
      rootMargin: '100px', // start loading slightly before paragraphs come into view
      threshold: 0.1 // trigger when at least 10% of the element is visible
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        const id = entry.target.getAttribute('data-paragraph-id');
        if (id) {
          setVisibleParagraphs(prev => ({
            ...prev,
            [id]: entry.isIntersecting
          }));
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    
    // Observe all paragraph elements
    Object.entries(paragraphRefs.current).forEach(([id, ref]) => {
      if (ref) {
        observer.observe(ref);
      }
    });
    
    return () => {
      observer.disconnect();
    };
  }, [article, showChat]);

  // Setup paragraph refs when article changes
  useEffect(() => {
    // Initialize all paragraphs as not visible
    const initialVisibility: Record<string, boolean> = {};
    Object.keys(article.paragraphs || {}).forEach(id => {
      initialVisibility[id] = false;
    });
    setVisibleParagraphs(initialVisibility);
    
    // Reset refs for new article
    paragraphRefs.current = {};
  }, [article]);

  const handleWordClick = (word: string) => {
    console.log('Clicked word:', word);
    const cleanedWord = cleanWord(word);
    setSelectedWord(cleanedWord);
    if (words.has(cleanedWord)) {
      removeWord(cleanedWord);
    } else {
      addWord(cleanedWord);
    }
    setSelectedWord(word);
  };

  const handleChatClick = () => {
    setShowChat(!showChat);
  };

  // Ref callback to set paragraph refs
  const setParagraphRef = useCallback((element: HTMLDivElement | null, id: string) => {
    paragraphRefs.current[id] = element;
  }, []);

  return (
    <>
      <style>{spinAnimation}</style>
      <div className="flex flex-col md:flex-row gap-1 relative min-h-screen w-full">
        <div className="flex-1 p-0 sm:p-4">
          <h1 className="text-2xl font-bold text-center mb-2 px-2">
            <InteractiveText
              text={article.title}
              isMarkdown={false}
              id="title"
              onWordClick={handleWordClick}
              isVisible={true} /* Title is always visible */
            />
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-4 py-2 border-b border-gray-200 dark:border-gray-700 mb-2">
            {/* Reading stats */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <BookIcon className="w-4 h-4" />
                <span>{article.word_count.toLocaleString()} words</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <ClockIcon className="w-4 h-4" />
                <span>{article.reading_time} min read</span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View original
                </a>
              </div>
            </div>

            {/* Source link */}
            
          </div>
          {!showChat ? (
            <div ref={contentRef} className="space-y-4 p-2">
              {Object.entries(article.paragraphs || {}).map(([id, paragraph]) => (
                <div
                  key={id}
                  ref={el => setParagraphRef(el, id)}
                  data-paragraph-id={id}
                  className="group relative p-2 bg-white p-1 hover:shadow-md transition-shadow"
                >
                  {paragraph.type === 'text' ? (
                    <InteractiveText
                      text={paragraph.content}
                      isMarkdown={false}
                      id={id}
                      onWordClick={handleWordClick}
                      isVisible={visibleParagraphs[id]}
                    />
                  ) : paragraph.type === 'image' ? (
                    <figure className="text-center">
                      <img
                        src={`${process.env.NEXT_PUBLIC_IMAGE_LOADER_URL}?url=${paragraph.content}`}
                        alt={paragraph.description || ''}
                        className="w-full h-auto rounded-lg"
                        loading="lazy"
                      />
                      {paragraph.description && (
                        <figcaption className="mt-2 text-sm text-gray-600 italic">
                          {paragraph.description}
                        </figcaption>
                      )}
                    </figure>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1">
              <ChatWindow
                article={article}
                onWordClick={handleWordClick}
                onError={(error) => console.error('Chat error:', error)}
              />
            </div>
          )}
        </div>
        <div className={`fixed md:sticky bottom-0 md:top-0 left-0 right-0 md:w-2/5 lg:w-1/3 h-[200px] md:h-screen bg-white md:bg-slate-50 overflow-y-auto border-t border-slate-200 md:border-l md:border-t-0 shadow-lg md:shadow-none z-2 ${!selectedWord ? 'hidden md:block' : ''}`}>
          <Dictionary selectedWord={selectedWord} />
          {!selectedWord && <div className='m-2'><Tips /></div>}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-2">
        <button
          onClick={handleChatClick}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
        >
          <span>{showChat ? 'Close Chat' : 'Practice'}</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      </div>
    </>
  );
};

export default Reader;
