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
import VocabularyBookPanel from './VocabularyBookPanel';
import { BookIcon, ClockIcon } from './icons/ReaderIcons';
import type { VocabularyBookWordDetails } from '../types/vocabularyBook';
import '../styles/tailwind.css';

export interface ReaderProps {
  article: Article;
  containedScroll?: boolean;
  contentScrollRef?: React.RefObject<HTMLDivElement>;
  vocabularyHighlightColorByWord?: Record<string, string>;
  vocabularyBookIdsByWord?: Record<string, string[]>;
  vocabularyWordDetailsByWord?: Record<string, VocabularyBookWordDetails[]>;
}
const spinAnimation = `
  @keyframes spin-slow {from {transform: rotate(0deg);}to {transform: rotate(360deg);}}
  .animate-spin-slow {animation: spin-slow 2s linear infinite;}`;

const Reader: React.FC<ReaderProps> = ({
  article,
  containedScroll = false,
  contentScrollRef,
  vocabularyHighlightColorByWord = {},
  vocabularyBookIdsByWord = {},
  vocabularyWordDetailsByWord = {},
}) => {
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
    const cleanedWord = cleanWord(word);
    if (words.has(cleanedWord)) {
      removeWord(cleanedWord);
    } else {
      addWord(cleanedWord);
    }
    setSelectedWord(cleanedWord);
  };

  const handleChatClick = () => {
    setShowChat(!showChat);
  };

  // Ref callback to set paragraph refs
  const setParagraphRef = useCallback((element: HTMLDivElement | null, id: string) => {
    paragraphRefs.current[id] = element;
  }, []);

  const selectedWordDetails = selectedWord
    ? vocabularyWordDetailsByWord[cleanWord(selectedWord)] || []
    : [];
  const isVocabularyWord = selectedWordDetails.length > 0;

  return (
    <>
      <style>{spinAnimation}</style>
      <div className={`relative flex w-full flex-col gap-5 xl:flex-row ${containedScroll ? 'h-full min-h-0 overflow-hidden' : ''}`}>
        <div className={`flex-1 ${containedScroll ? 'min-h-0 overflow-hidden' : ''}`}>
          <div className={`overflow-hidden rounded-[32px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.10)] ${containedScroll ? 'flex h-full min-h-0 flex-col overflow-hidden' : ''}`}>
            {!showChat ? (
              <div
                ref={contentRef}
                className={`${containedScroll ? 'min-h-0 flex-1 overflow-y-auto' : ''}`}
              >
                <div className="border-b border-black/6 bg-[#fbfbfd] px-5 py-4 md:px-8 md:py-5">
                  <div className="mx-auto max-w-[980px]">
                    <h1 className={`px-1 text-center font-semibold leading-[1.15] tracking-[-0.03em] text-[#1d1d1f] ${containedScroll ? 'text-[24px] sm:text-[28px]' : 'text-[30px] md:text-[36px]'}`}>
                      {article.title}
                    </h1>
                    <div className="mt-3 flex flex-col justify-center gap-2 border-t border-black/6 pt-3 sm:flex-row sm:items-center">
                      <div className="flex items-center justify-center gap-2.5">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] tracking-[-0.18px] text-black/64 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                          <BookIcon className="h-4 w-4" />
                          <span>{article.word_count.toLocaleString()} words</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] tracking-[-0.18px] text-black/64 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                          <ClockIcon className="h-4 w-4" />
                          <span>{article.reading_time} min read</span>
                        </div>
                      </div>
                      {article.site_name ? (
                        <div className="text-center text-[13px] tracking-[-0.18px] text-black/48">
                          {article.site_name}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mx-auto max-w-[980px] space-y-6 px-5 py-8 md:px-8 md:py-10">
                  {Object.entries(article.paragraphs || {}).map(([id, paragraph]) => (
                    <div
                      key={id}
                      ref={el => setParagraphRef(el, id)}
                      data-paragraph-id={id}
                      className="group relative px-1 py-1 md:px-0 md:py-1"
                    >
                      {paragraph.type === 'text' ? (
                        <div className="text-[17px] leading-[1.8] tracking-[-0.37px] text-[#1d1d1f]">
                          <InteractiveText
                            text={paragraph.content}
                            isMarkdown={false}
                            id={id}
                            onWordClick={handleWordClick}
                            isVisible={containedScroll ? visibleParagraphs[id] ?? true : visibleParagraphs[id]}
                            vocabularyHighlightColorByWord={vocabularyHighlightColorByWord}
                            vocabularyBookIdsByWord={vocabularyBookIdsByWord}
                          />
                        </div>
                      ) : paragraph.type === 'image' ? (
                        <figure className="text-center">
                          <img
                            src={`${process.env.NEXT_PUBLIC_IMAGE_LOADER_URL}?url=${paragraph.content}`}
                            alt={paragraph.description || ''}
                            className="mx-auto h-auto max-w-full rounded-[24px]"
                            loading="lazy"
                          />
                          {paragraph.description && (
                            <figcaption className="mt-3 text-[14px] italic tracking-[-0.22px] text-black/56">
                              {paragraph.description}
                            </figcaption>
                          )}
                        </figure>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`${containedScroll ? 'min-h-0 flex-1 overflow-y-auto' : 'flex-1'} px-5 py-6 md:px-8`}>
                <ChatWindow
                  article={article}
                  onWordClick={handleWordClick}
                  onError={(error) => console.error('Chat error:', error)}
                />
              </div>
            )}
          </div>
        </div>
        <div className={`${containedScroll ? 'hidden h-full overflow-y-auto border-l border-black/6 bg-white md:block md:w-2/5 lg:w-1/3' : 'fixed bottom-0 left-0 right-0 z-10 h-[220px] overflow-y-auto border-t border-black/8 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.12)] md:static md:h-auto md:w-full md:shadow-none xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:w-[640px] xl:flex-none xl:overflow-hidden xl:rounded-[32px] xl:border xl:border-black/6 xl:shadow-[0_20px_60px_rgba(0,0,0,0.10)]'} ${!selectedWord ? 'hidden md:block' : ''}`}>
          {isVocabularyWord ? (
            <VocabularyBookPanel selectedWord={selectedWord} details={selectedWordDetails} />
          ) : (
            <Dictionary selectedWord={selectedWord} />
          )}
          {!selectedWord && <div className="m-3 rounded-[24px] bg-[#f5f5f7]"><Tips /></div>}
        </div>
      </div>
    </>
  );
};

export default Reader;
