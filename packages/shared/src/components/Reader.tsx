'use client';

import React, { useState } from 'react';
import Dictionary from './Dictionary';
import Tips from './Tips';
import { useTTS } from '../hooks/useTTS';
import { useTranslation } from '../hooks/useTranslation';
import { useWordList } from '../hooks/useWordList';
import type { Article } from '../types';
import { cleanWord } from '../utils/helper';
import { ChatWindow } from './ChatWindow';
import { InteractiveText } from './InteractiveText';
import '../styles/tailwind.css';

export interface ReaderProps {
  article: Article;
}
const spinAnimation = `
  @keyframes spin-slow {from {transform: rotate(0deg);}to {transform: rotate(360deg);}}
  .animate-spin-slow {animation: spin-slow 2s linear infinite;}`;

const Reader: React.FC<ReaderProps> = ({ article }) => {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [speakingPid, setSpeakingPid] = useState<string | null>(null);
  const { speak, speaking } = useTTS();
  const [translatingPid, setTranslatingPid] = useState<number | null>(null);
  const { translating, translate } = useTranslation();
  const { words, addWord, removeWord } = useWordList();
  const [showChat, setShowChat] = useState(false);
  const [showDictionary, setShowDictionary] = useState(false);

  const handleTranslate = async (paragraphId: number) => {
    if (translations[paragraphId]) return;

    setTranslatingPid(paragraphId);
    const paragraph = article.paragraphs[paragraphId];
    const translation = await translate(paragraph.content);
    setTranslatingPid(null);

    setTranslations(prev => ({
      ...prev,
      [paragraphId]: translation
    }));
  };

  const handleSpeak = async (text: string, id: string) => {
    setSpeakingPid(id);
    await speak(text);
    setSpeakingPid(null);
  };

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

  return (
    <>
      <style>{spinAnimation}</style>
      <div className="flex flex-col md:flex-row gap-1 relative min-h-screen w-full">
        <div className="flex-1 p-0 sm:p-4">
          <h1 className="text-2xl font-bold text-center mb-6 px-2">
            <InteractiveText
              text={article.title}
              isMarkdown={false}
              id="title"
              onWordClick={handleWordClick}
            />
          </h1>

          {!showChat ? (
            <div className="space-y-4 p-2">
              {Object.entries(article.paragraphs || {}).map(([id, paragraph]) => (
                <div
                  key={id}
                  className="group relative p-2 bg-white p-1 hover:shadow-md transition-shadow"
                >
                  {paragraph.type === 'text' ? (
                    <InteractiveText
                      text={paragraph.content}
                      isMarkdown={false}
                      id={id}
                      onWordClick={handleWordClick}
                    />
                  ) : paragraph.type === 'image' ? (
                    <figure className="text-center">
                      <img
                        src={paragraph.content}
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
        <div className={`fixed md:sticky bottom-0 md:top-0 left-0 right-0 md:w-2/5 lg:w-1/3 h-[200px] md:h-screen bg-white md:bg-slate-50 overflow-y-auto border-t border-slate-200 md:border-l md:border-t-0 shadow-lg md:shadow-none z-50 ${!selectedWord ? 'hidden md:block' : ''}`}>
          <Dictionary selectedWord={selectedWord} />
          {!selectedWord && <div className='m-2'><Tips /></div>}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleChatClick}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
        >
          <span>{showChat ? 'Back to Article' : 'Practice English'}</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      </div>
    </>
  );
};

export default Reader;
