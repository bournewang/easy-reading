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
  containedScroll?: boolean;
  contentScrollRef?: React.RefObject<HTMLDivElement>;
}
const spinAnimation = `
  @keyframes spin-slow {from {transform: rotate(0deg);}to {transform: rotate(360deg);}}
  .animate-spin-slow {animation: spin-slow 2s linear infinite;}`;

const Reader: React.FC<ReaderProps> = ({ article, containedScroll = false, contentScrollRef }) => {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const { words, addWord, removeWord } = useWordList();
  const [showChat, setShowChat] = useState(false);
  const [visibleParagraphs, setVisibleParagraphs] = useState<Record<string, boolean>>({});
  const internalContentRef = useRef<HTMLDivElement>(null);
  const contentRef = contentScrollRef || internalContentRef;
  const paragraphRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Setup intersection observer to track which paragraphs are visible
  useEffect(() => {
    const observerOptions = {
      root: containedScroll ? contentRef.current : null,
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
  }, [article, containedScroll, contentRef, showChat]);

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
      <div className={`flex flex-col md:flex-row gap-1 relative w-full ${containedScroll ? 'h-full min-h-0 overflow-hidden' : 'min-h-screen'}`}>
        <div className={`flex-1 p-0 ${containedScroll ? 'min-h-0 overflow-hidden' : 'sm:p-2'}`}>
          <div className={`flex flex-col ${containedScroll ? 'h-full min-h-0 overflow-hidden' : ''}`}>
            <div className="shrink-0">
              <h1 className={`text-center font-bold px-2 ${containedScroll ? 'mb-1 text-xl sm:text-2xl' : 'mb-2 text-2xl'}`}>
                <InteractiveText
                  text={article.title}
                  isMarkdown={false}
                  id="title"
                  onWordClick={handleWordClick}
                  isVisible={true}
                />
              </h1>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-center gap-4 border-b border-gray-200 dark:border-gray-700 ${containedScroll ? 'mb-1 py-1.5' : 'mb-2 py-2'}`}>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <BookIcon className="w-4 h-4" />
                    <span>{article.word_count.toLocaleString()} words</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <ClockIcon className="w-4 h-4" />
                    <span>{article.reading_time} min read</span>
                  </div>
                </div>
              </div>
            </div>
            {!showChat ? (
              <div
                ref={contentRef}
                className={`space-y-4 p-1 ${containedScroll ? 'min-h-0 flex-1 overflow-y-auto pr-2' : 'sm:p-2'}`}
              >
                {Object.entries(article.paragraphs || {}).map(([id, paragraph]) => (
                  <div
                    key={id}
                    ref={el => setParagraphRef(el, id)}
                    data-paragraph-id={id}
                    className="group relative bg-white p-1 hover:shadow-md transition-shadow"
                  >
                    {paragraph.type === 'text' ? (
                      <InteractiveText
                        text={paragraph.content}
                        isMarkdown={false}
                        id={id}
                        onWordClick={handleWordClick}
                        isVisible={containedScroll ? visibleParagraphs[id] ?? true : visibleParagraphs[id]}
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
              <div className={`${containedScroll ? 'min-h-0 flex-1 overflow-y-auto' : 'flex-1'}`}>
                <ChatWindow
                  article={article}
                  onWordClick={handleWordClick}
                  onError={(error) => console.error('Chat error:', error)}
                />
              </div>
            )}
          </div>
        </div>
        <div className={`${containedScroll ? 'hidden md:block md:w-2/5 lg:w-1/3 h-full overflow-y-auto border-l border-slate-200 bg-slate-50' : `fixed md:sticky bottom-0 md:top-0 left-0 right-0 md:w-2/5 lg:w-1/3 h-[200px] md:h-screen bg-white md:bg-slate-50 overflow-y-auto border-t border-slate-200 md:border-l md:border-t-0 shadow-lg md:shadow-none`} z-2 ${!selectedWord ? 'hidden md:block' : ''}`}>
          <Dictionary selectedWord={selectedWord} />
          {!selectedWord && <div className='m-2'><Tips /></div>}
        </div>
      </div>
    </>
  );
};

export default Reader;
