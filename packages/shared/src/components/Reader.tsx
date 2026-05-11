'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Dictionary from './Dictionary';
import { useTTS } from '../hooks/useTTS';
import { useTranslation } from '../hooks/useTranslation';
import { useWordList } from '../hooks/useWordList';
import type { Article } from '../types';
import { cleanWord } from '../utils/helper';
import { ChatWindow } from './ChatWindow';
import { InteractiveText } from './InteractiveText';
import VocabularyDetail from './VocabularyDetail';
import { BookIcon, ClockIcon, CloseIcon } from './icons/ReaderIcons';
import type { VocabularyBookWordDetails } from '../types/vocabularyBook';
import '../styles/tailwind.css';

export interface ReaderProps {
  article: Article;
  containedScroll?: boolean;
  contentScrollRef?: React.RefObject<HTMLDivElement>;
  vocabularyHighlightColorByWord?: Record<string, string>;
  vocabularyBookIdsByWord?: Record<string, string[]>;
  vocabularyBookDisplayTagById?: Record<string, string>;
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
  vocabularyBookDisplayTagById = {},
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
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [isMobilePanelExpanded, setIsMobilePanelExpanded] = useState(false);
  const mobilePanelHiddenClass = containedScroll ? 'min-[800px]:hidden' : 'xl:hidden';

  useEffect(() => {
    if (selectedWord) {
      setIsMobilePanelOpen(true);
      setIsMobilePanelExpanded(false);
      return;
    }

    setIsMobilePanelOpen(false);
    setIsMobilePanelExpanded(false);
  }, [selectedWord]);

  const mobileExpandButtonClassName = containedScroll ? 'min-[800px]:hidden' : 'xl:hidden';
  const mobileContentHeightClassName = isMobilePanelExpanded
    ? containedScroll ? 'h-[70dvh] min-[800px]:h-auto' : 'h-[70dvh] xl:h-auto'
    : containedScroll ? 'h-[35dvh] min-[800px]:h-auto' : 'h-[35dvh] xl:h-auto';
  const panelContent = isVocabularyWord ? (
    <VocabularyDetail
      selectedWord={selectedWord}
      details={selectedWordDetails}
      mobileExpanded={isMobilePanelExpanded}
      onMobileExpandedChange={setIsMobilePanelExpanded}
      mobileExpandButtonClassName={mobileExpandButtonClassName}
      mobileContentHeightClassName={mobileContentHeightClassName}
    />
  ) : (
    <Dictionary
      selectedWord={selectedWord}
      mobileExpanded={isMobilePanelExpanded}
      onMobileExpandedChange={setIsMobilePanelExpanded}
      mobileExpandButtonClassName={mobileExpandButtonClassName}
      mobileContentHeightClassName={mobileContentHeightClassName}
    />
  );

  return (
    <>
      <style>{spinAnimation}</style>
      <div className={`relative flex w-full flex-col gap-5 ${containedScroll ? 'h-full min-h-0 overflow-hidden min-[800px]:flex-row' : 'xl:flex-row'}`}>
        <div className={`min-w-0 flex-1 ${containedScroll ? 'min-h-0 overflow-hidden' : ''}`}>
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
                <div className="mx-auto max-w-[980px] space-y-2 p-2">
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
                            vocabularyBookDisplayTagById={vocabularyBookDisplayTagById}
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
        <div className={`${containedScroll ? 'hidden h-full min-h-0 overflow-y-auto border-l border-black/6 bg-white min-[800px]:block min-[800px]:w-2/5 min-[800px]:flex-none lg:w-1/3' : 'hidden xl:sticky xl:top-6 xl:block xl:max-h-[calc(100vh-3rem)] xl:w-[640px] xl:flex-none xl:overflow-hidden xl:rounded-[32px] xl:border xl:border-black/6 xl:bg-white xl:shadow-[0_20px_60px_rgba(0,0,0,0.10)]'} ${!selectedWord ? 'hidden min-[800px]:block' : ''}`}>
          {panelContent}
        </div>
      </div>

      {selectedWord ? (
        <>
          <div
            className={`fixed inset-0 z-20 bg-slate-950/18 transition-opacity duration-200 ${mobilePanelHiddenClass} ${isMobilePanelOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
            onClick={() => setIsMobilePanelOpen(false)}
            aria-hidden="true"
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-30 ${mobilePanelHiddenClass} ${isMobilePanelOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
            aria-hidden={!isMobilePanelOpen}
          >
            <div className="mx-auto max-w-3xl px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
              <div
                className={`overflow-hidden rounded-t-[28px] border border-black/8 bg-[#f5f5f7] shadow-[0_-20px_50px_rgba(15,23,42,0.22)] transition-transform duration-300 ${isMobilePanelOpen ? 'translate-y-0' : 'translate-y-[calc(100%+1rem)]'}`}
              >
                {/* <div className="flex items-center justify-between border-b border-black/6 bg-white/92 px-4 py-3 backdrop-blur">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {isVocabularyWord ? 'Vocabulary' : 'Dictionary'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMobilePanelOpen(false)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
                      aria-label="Close word panel"
                    >
                      <CloseIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div> */}
                {panelContent}
              </div>
            </div>
          </div>
        </>
      ) : null}

      {selectedWord && !isMobilePanelOpen ? (
        <button
          type="button"
          onClick={() => setIsMobilePanelOpen(true)}
          className={`fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] right-4 z-20 inline-flex max-w-[calc(100vw-2rem)] items-center rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white shadow-[0_16px_36px_rgba(15,23,42,0.28)] transition-transform hover:-translate-y-0.5 ${mobilePanelHiddenClass}`}
        >
          <span className="truncate">{selectedWord}</span>
        </button>
      ) : null}
    </>
  );
};

export default Reader;
