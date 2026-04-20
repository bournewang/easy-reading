'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { AxiosProgressEvent } from 'axios';
import { useWordList } from '../hooks/useWordList';
import { useWordPractice, WordPractice } from '../hooks/useWordPractice';
import { useTTS } from '../hooks/useTTS';
import { useTranslation } from '../hooks/useTranslation';
import { splitIntoSentences } from '../utils/sentenceSplitter';
import Dictionary from './Dictionary';
import {Paginator} from './Paginator';
import { api } from '../utils/api';
import { showToast } from '../utils/toast';
import '../styles/tailwind.css';

function WordList() {
  const { words, removeWord } = useWordList();
  const { practiceData, getPracticeStats, recordAttempt } = useWordPractice();
  const { speak, speaking: ttsSpeaking } = useTTS();
  const { translate } = useTranslation();
  const practiceInputRef = useRef<HTMLInputElement>(null);

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'cloud'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [isPracticeModeActive, setIsPracticeModeActive] = useState(false);
  const [isStoryModeActive, setIsStoryModeActive] = useState(false);
  const [practiceWords, setPracticeWords] = useState<string[]>([]);
  const [currentPracticeIndex, setCurrentPracticeIndex] = useState(0);
  const [practiceInputValue, setPracticeInputValue] = useState('');
  const [practiceFeedback, setPracticeFeedback] = useState('');
  const [isWordRevealed, setIsWordRevealed] = useState(false);
  const [practiceSessionSummary, setPracticeSessionSummary] = useState<{ correct: number, incorrect: number, wordsPracticed: number} | null>(null);
  
  // Story mode states
  const [storyContent, setStoryContent] = useState('');
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [storySentences, setStorySentences] = useState<string[]>([]);
  const [sentenceStates, setSentenceStates] = useState<Record<number, {
    translation: string;
    speaking: boolean;
    translating: boolean;
  }>>({});

  const wordArray = Array.from(words);
  const totalPages = Math.ceil(wordArray.length / itemsPerPage);

  const isFirstWordOfCurrentSessionRef = useRef(true);
  const pageButtonBaseClass =
    'inline-flex items-center justify-center rounded-full px-4 py-2 text-[14px] font-medium tracking-[-0.22px] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-2';
  const primaryButtonClass = `${pageButtonBaseClass} bg-[#0071e3] text-white hover:bg-[#0077ed]`;
  const secondaryButtonClass = `${pageButtonBaseClass} border border-[#0071e3] bg-transparent text-[#0066cc] hover:bg-[#0071e3]/[0.06]`;
  const darkButtonClass = `${pageButtonBaseClass} bg-[#1d1d1f] text-white hover:bg-black`;

  // Effect to RESET states when the practice word changes or practice mode starts/ends
  useEffect(() => {
    if (isPracticeModeActive) {
      setIsWordRevealed(false);
      setPracticeInputValue('');
      setPracticeFeedback('');
      // Focus the input when switching words
      requestAnimationFrame(() => {
        practiceInputRef.current?.focus();
      });
    } else {
      // Clear practice-specific states when exiting practice mode
      setPracticeWords([]);
      setCurrentPracticeIndex(0);
      setPracticeInputValue('');
      setPracticeFeedback('');
      setIsWordRevealed(false);
    }
  }, [isPracticeModeActive, currentPracticeIndex]);

  // Add a new effect specifically for focusing after TTS finishes
  useEffect(() => {
    if (!ttsSpeaking && isPracticeModeActive) {
      requestAnimationFrame(() => {
        practiceInputRef.current?.focus();
      });
    }
  }, [ttsSpeaking, isPracticeModeActive]);

  useEffect(() => {
    if (currentPage > 1 && currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [words, currentPage, totalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentWordsForDisplay = wordArray.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedWord(null);
  };

  const startPracticeSession = (practiceCurrentPageOnly: boolean = false) => {
    const allWords = practiceCurrentPageOnly ? currentWordsForDisplay : Array.from(words);
    if (allWords.length === 0) {
      showToast('Please add some words to your list first.', { variant: 'info' });
      return;
    }

    // Filter out words that have been practiced
    const unpracticedWords = allWords.filter(word => {
      const stats = getPracticeStats(word);
      return stats.proficiency === 0; // Only include words that haven't been practiced
    });

    // If all words have been practiced, use all words
    const wordsToPractice = unpracticedWords.length > 0 ? unpracticedWords : allWords;
    
    setPracticeWords(wordsToPractice);
    setCurrentPracticeIndex(0);
    setIsPracticeModeActive(true);
    setPracticeSessionSummary(null);
    setSelectedWord(null);

    // Play the first word's audio after a short delay to ensure state updates are complete
    if (wordsToPractice.length > 0) {
      speak(wordsToPractice[0]);
    }
  };

  const exitPracticeSession = () => {
    // Calculate words practiced in this session
    const wordsPracticed = currentPracticeIndex + (practiceFeedback.startsWith("Correct") && currentPracticeIndex < practiceWords.length ? 1 : 0);
    
    setPracticeSessionSummary({ 
      correct: 0, 
      incorrect: 0, 
      wordsPracticed: wordsPracticed 
    });
    setIsPracticeModeActive(false);
  };
  
  const handlePlayCurrentWordAudio = () => {
    if (isPracticeModeActive && practiceWords.length > 0 && currentPracticeIndex < practiceWords.length) {
      const wordToSpeak = practiceWords[currentPracticeIndex];
      speak(wordToSpeak);
    }
  };

  const advanceToNextWord = (newIndex: number) => {
    setCurrentPracticeIndex(newIndex);
    if (newIndex < practiceWords.length) {
        const nextWordToSpeak = practiceWords[newIndex];
        speak(nextWordToSpeak);
        // Focus after a short delay to ensure the input is enabled
        setTimeout(() => {
          practiceInputRef.current?.focus();
        }, 100);
    }
  };

  const handlePracticeSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!practiceWords[currentPracticeIndex] || ttsSpeaking) return;

    const currentWord = practiceWords[currentPracticeIndex];
    const trimmedInput = practiceInputValue.trim();

    if (trimmedInput === currentWord) {
      if (!isWordRevealed) {
        recordAttempt(currentWord, true);
      }
      setPracticeFeedback(`Correct!`);
      // isWordRevealed is reset by useEffect when currentPracticeIndex changes
      setTimeout(() => {
        if (currentPracticeIndex < practiceWords.length - 1) {
          advanceToNextWord(currentPracticeIndex + 1);
        } else {
          setPracticeFeedback("You've completed all words!");
        }
      }, 1000);
    } else {
      setPracticeFeedback(`Incorrect. Try again, reveal, or skip.`);
    }
  };

  const handleRevealAnswer = () => {
    if (!practiceWords[currentPracticeIndex] || ttsSpeaking) return;
    const currentWord = practiceWords[currentPracticeIndex];
    if (!isWordRevealed) {
        recordAttempt(currentWord, false);
        setIsWordRevealed(true);
        setPracticeFeedback(`The word is: ${currentWord}. Type it to continue.`);
    }
  };

  const handlePracticeNextWord = () => {
    if (!practiceWords[currentPracticeIndex] || ttsSpeaking) return;
    const currentWord = practiceWords[currentPracticeIndex];
    
    if (!practiceFeedback.startsWith('Correct')) {
        // Only record as incorrect if an attempt was made or word was revealed
        if(isWordRevealed || practiceInputValue.trim() !== '') {
             recordAttempt(currentWord, false);
        }
    }

    if (currentPracticeIndex < practiceWords.length - 1) {
      advanceToNextWord(currentPracticeIndex + 1);
    } else {
      setPracticeFeedback("You've reached the end of the words!");
    }
  };

  // --- Updated Word Display with Proficiency ---
  // Define proficiency tiers with their classes in a single place
  const proficiencyConfig = [
    { tier: '', range: 'New', classes: 'bg-white hover:bg-gray-50 text-gray-400' },
    { tier: 'Novice', range: '0-20%', classes: 'bg-gray-100 hover:bg-gray-200 text-gray-700' },
    { tier: 'Beginner', range: '20-40%', classes: 'bg-orange-100 hover:bg-orange-200 text-orange-800' },
    { tier: 'Intermediate', range: '40-60%', classes: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' },
    { tier: 'Advanced', range: '60-80%', classes: 'bg-blue-100 hover:bg-blue-200 text-blue-800' },
    { tier: 'Master', range: '80-100%', classes: 'bg-green-100 hover:bg-green-200 text-green-800' }
  ];

  const getProficiencyColor = (proficiency: number, tier: string) => {
    // Find the config entry for this tier
    const config = proficiencyConfig.find(config => config.tier === tier);
    return config ? config.classes : proficiencyConfig[1].classes; // Default to Novice if not found
  };

  const renderWordItem = (word: string, isCloudView: boolean = false) => {
    const stats = getPracticeStats(word);
    const proficiencyColor = getProficiencyColor(stats.proficiency, stats.tier);
    const isSelected = selectedWord === word;

    if (isCloudView) {
        const fontSize = Math.random() * (1.5 - 0.8) + 0.8;
        const rotation = Math.random() * 20 - 10;
        return (
            <div
              key={word}
              className="group inline-flex items-center"
              style={{ transform: `rotate(${rotation}deg)`, fontSize: `${fontSize}rem` }}
            >
              <button
                type="button"
                className={`rounded-full px-4 py-2 transition-all duration-200 ${proficiencyColor} ${isSelected ? 'ring-2 ring-[#0071e3] ring-offset-2 ring-offset-[#f5f5f7]' : 'hover:scale-[1.02]'}`}
                onClick={() => setSelectedWord(word)}
              >
                {word}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeWord(word); }}
                className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white text-[13px] text-black/55 opacity-0 transition-all hover:border-black/20 hover:text-black/80 group-hover:opacity-100"
                title="Remove word"
              >
                ✕
              </button>
            </div>
        );
    }
    return (
      <div
        key={word}
        className={`group flex items-center justify-between rounded-[24px] border border-black/6 px-5 py-4 transition-all duration-200 ${proficiencyColor} ${isSelected ? 'ring-2 ring-[#0071e3] ring-offset-2 ring-offset-[#f5f5f7]' : 'hover:border-black/12 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]'}`}
      >
        <button
          type="button"
          className="flex-1 text-left text-[17px] font-medium tracking-[-0.37px] text-[#1d1d1f] transition-colors hover:text-[#0066cc]"
          onClick={() => setSelectedWord(word)}
        >
          {word}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); removeWord(word); }}
          className="ml-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-[13px] text-black/55 opacity-0 transition-all hover:border-black/20 hover:text-black/80 group-hover:opacity-100"
          title="Remove word"
        >
          ✕
        </button>
      </div>
    );
  };

  const renderProficiencyLegend = () => (
    <div className="rounded-[28px] bg-white px-6 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
      <h3 className="mb-3 text-[14px] font-semibold tracking-[-0.22px] text-black/80">Proficiency Levels</h3>
      <div className="flex flex-wrap gap-2">
        {proficiencyConfig.filter(config => config.tier !== '').map(config => (
          <div key={config.tier} className={`flex items-center rounded-full px-3 py-1.5 ${config.classes}`}>
            <span className="text-[12px] tracking-[-0.12px]">{config.tier} ({config.range})</span>
          </div>
        ))}
      </div>
    </div>
  );

  const newRenderGridView = () => (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {currentWordsForDisplay.map(word => renderWordItem(word))}
      </div>
    </>
  );

  const newRenderCloudView = () => (
    <>
      <div className="flex min-h-[320px] flex-wrap items-center justify-center gap-4 rounded-[28px] bg-[#fbfbfd] px-6 py-8">
        {currentWordsForDisplay.map(word => renderWordItem(word, true))} 
      </div>
    </>
  );

  // --- Practice Mode View ---
  const renderPracticeView = () => {
    if (practiceSessionSummary) {
        return (
            <div className="mx-auto mt-8 w-full max-w-xl rounded-[32px] bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
                <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0071e3]">Session Complete</div>
                <h3 className="mb-3 text-[40px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#1d1d1f]">Nice work.</h3>
                <p className="mb-2 text-[17px] tracking-[-0.37px] text-black/80">Words practiced: {practiceSessionSummary.wordsPracticed}</p>
                <p className="mb-6 text-[14px] tracking-[-0.22px] text-black/56">Keep reviewing to move more words into the advanced tiers.</p>
                <button 
                    onClick={() => { setIsPracticeModeActive(false); setPracticeSessionSummary(null); }}
                    className={primaryButtonClass}>
                    Back to Word List
                </button>
            </div>
        );
    }
    
    const noWordsToPractice = practiceWords.length === 0 && isPracticeModeActive;
    const practiceFinished = currentPracticeIndex >= practiceWords.length && practiceWords.length > 0;

    if (noWordsToPractice) {
        return (
            <div className="mx-auto mt-8 w-full max-w-xl rounded-[32px] bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
                <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0071e3]">Practice</div>
                <p className="mb-4 text-[17px] tracking-[-0.37px] text-black/80">Your word list is empty. Add some words to practice.</p>
                <button 
                    onClick={() => setIsPracticeModeActive(false)} 
                    className={primaryButtonClass}>
                    Back to Word List
                </button>
            </div>
        );
    }

    if (practiceFinished) {
         if(practiceFeedback.includes("completed") || practiceFeedback.includes("end")) {
            return (
                <div className="mx-auto mt-8 w-full max-w-xl rounded-[32px] bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
                    <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0071e3]">Practice</div>
                    <h3 className="mb-4 text-[40px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#1d1d1f]">Practice complete.</h3>
                    <p className="mb-6 text-[17px] tracking-[-0.37px] text-black/80">{practiceFeedback}</p>
                    <button 
                        onClick={exitPracticeSession}
                        className={primaryButtonClass}>
                        View Summary & Exit
                    </button>
                </div>
            );
        }
        return <div className="text-center py-12"><p className="text-gray-500">Session ended or loading issue...</p></div>;
    }

    const currentWordToPractice = practiceWords[currentPracticeIndex];

    return (
      <div className="mx-auto mt-4 max-w-xl overflow-hidden">
        <div className="mb-4 rounded-[28px] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[21px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
              Practice Session
            </h3>
            <span className="rounded-full bg-[#f5f5f7] px-3 py-1 text-[12px] font-semibold tracking-[-0.12px] text-black/72">
              {currentPracticeIndex + 1} of {practiceWords.length}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-black/8">
            <div 
              className="h-2.5 rounded-full bg-[#0071e3] transition-all duration-300" 
              style={{ width: `${((currentPracticeIndex + 1) / practiceWords.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
          <div className="bg-[#1d1d1f] p-8 text-center text-white">
            <button 
              onClick={handlePlayCurrentWordAudio} 
              disabled={ttsSpeaking || !currentWordToPractice}
              className="mx-auto flex items-center justify-center rounded-full border border-white/20 bg-white px-6 py-3 text-[17px] font-medium tracking-[-0.37px] text-[#1d1d1f] transition-all duration-200 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ttsSpeaking ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#0071e3]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Speaking...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                  </svg>
                  Listen
                </>
              )}
            </button>
          </div>

          <div className="p-6">
            {/* Word reveal area */}
            <div 
              className={`mb-5 flex min-h-[84px] cursor-pointer items-center justify-center rounded-[24px] p-5 transition-all duration-200 ${
                isWordRevealed 
                  ? 'bg-[#f5f9ff] text-[#0066cc]'
                  : 'bg-[#f5f5f7] text-black/50 hover:bg-black/5'
              }`}
              onClick={() => {
                if (!isWordRevealed) {
                  handleRevealAnswer();
                } else {
                  setSelectedWord(currentWordToPractice);
                }
              }}
            >
              {isWordRevealed ? (
                <div className="text-[28px] font-semibold tracking-[0.01em]">{currentWordToPractice}</div>
              ) : (
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  <span>Click to reveal word</span>
                </div>
              )}
            </div>

            {/* Input area */}
            <form onSubmit={handlePracticeSubmit} className="mb-4">
              <label htmlFor="practice-input" className="mb-2 block text-[14px] font-semibold tracking-[-0.22px] text-black/72">
                Type what you hear:
              </label>
              <input 
                id="practice-input"
                ref={practiceInputRef}
                type="text" 
                value={practiceInputValue}
                onChange={(e) => setPracticeInputValue(e.target.value)}
                className="w-full rounded-[18px] border border-black/10 bg-[#fafafc] px-4 py-3 text-[17px] tracking-[-0.37px] text-[#1d1d1f] transition-all focus:border-[#0071e3] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                placeholder="Type the word..."
                autoFocus
                disabled={ttsSpeaking || (practiceFeedback.startsWith('Correct') && !isWordRevealed)}
                onFocus={(e) => e.target.select()}
              />
            </form>

            {/* Feedback area */}
            {practiceFeedback && (
              <div className={`mb-5 rounded-[18px] p-3 text-center text-[15px] font-medium tracking-[-0.24px] ${
                practiceFeedback.startsWith('Correct') 
                  ? 'bg-[#e8f5e9] text-[#215732]' 
                  : 'bg-[#fff1f0] text-[#8b2b1d]'
              }`}>
                {practiceFeedback}
              </div>
            )}

            <div className="flex gap-2">
              <button 
                onClick={handlePracticeNextWord} 
                className={`flex-1 ${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                disabled={ttsSpeaking}
              >
                Skip / Next
              </button>
              <button
                onClick={exitPracticeSession}
                className={`flex-1 ${darkButtonClass}`}
              >
                Exit Practice
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  // ------------------------

  // Generate story with current page words or all words
  const generateStory = async (useCurrentPageOnly: boolean = true) => {
    // Reset story states
    setStoryContent('');
    setStoryError(null);
    setIsGeneratingStory(true);
    setIsStoryModeActive(true);
    
    // For tracking accumulated content across progress events
    // let accumulatedContent = '';
    
    // Determine which words to use
    const wordsToUse = useCurrentPageOnly ? currentWordsForDisplay : wordArray;
    
    if (wordsToUse.length === 0) {
      setStoryError("No words available. Please add some words to your word list.");
      setIsGeneratingStory(false);
      return;
    }
    
    // Limit to 20 words maximum for story generation
    const selectedWords = wordsToUse.slice(0, 20);
    
    try {
      console.log('Making API request with words:', selectedWords);
      
      // Create the request payload
      const payload = {
        words: selectedWords,
        type: 'sentences',
        theme: 'learning',
        length: 'short',
        level: 'intermediate'
      };
      
      // Use the api utility without the problematic Cache-Control header
      const response = await api.post('/api/ai/makeStory', payload, { 
        responseType: 'text',
        headers: {
          'Accept': 'text/event-stream'
        },
        // Enable Axios response streaming by setting a custom onDownloadProgress handler
        onDownloadProgress: (progressEvent: AxiosProgressEvent) => {
          // Access the partial text response
          if (progressEvent.event && progressEvent.event.target) {
            const xhr = progressEvent.event.target as XMLHttpRequest;
            const newData = xhr.responseText;
            
            // Track previous length to find only new content
            // const prevProcessedLength = accumulatedContent.length;
            console.log("progressEvent ", newData)
            
            // Process the SSE data
            const lines = newData.split('\n');
            let hasNewContent = false;
            let accumulatedContent = '';
            
            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.substring(6));
                  
                  if (data.content) {
                    accumulatedContent += data.content;
                    hasNewContent = true;
                  }
                  
                  if (data.message && data.done) {
                    // If we receive a complete message, use that instead
                    accumulatedContent = data.message;
                    hasNewContent = true;
                  }
                } catch (e) {
                  console.error('Error parsing line:', e);
                }
              }
            }
            
            // Update the UI only if we have new content
            if (hasNewContent) {
              console.log('Updating story with new content, length:', accumulatedContent.length);
              setStoryContent(accumulatedContent);
            }
          }
        }
      });
      
      // This will be called when the entire response is complete
      console.log('Complete response received');
      setIsGeneratingStory(false);
    } catch (error: any) {
      console.error('Failed to generate story:', error);
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        setStoryError(`Error: ${error.response.data.message || error.response.statusText}`);
      } else if (error.message) {
        setStoryError(`Error: ${error.message}`);
      } else {
        setStoryError('Failed to generate the story. Please try again later.');
      }
      
      setIsGeneratingStory(false);
    }
  };

  // Format the story content by converting markdown to HTML and splitting into sentences
  const formatStoryContent = (content: string) => {
    // Bold text (convert **word** to <strong>word</strong>)
    const formattedContent = content.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-indigo-700">$1</strong>');
    
    // Split into sentences after formatting
    if (content && !isGeneratingStory) {
      try {
        const sentences = splitIntoSentences(content);
        setStorySentences(sentences);
      } catch (error) {
        console.error('Failed to split story into sentences:', error);
      }
    }
    
    return formattedContent;
  };

  useEffect(() => {
    if (storyContent && !isGeneratingStory) {
      formatStoryContent(storyContent);
    }
  }, [storyContent, isGeneratingStory]);

  const handleTranslateSentence = async (sentenceIndex: number, text: string) => {
    if (sentenceStates[sentenceIndex]?.translation) return;
    
    setSentenceStates(prev => ({
      ...prev,
      [sentenceIndex]: {
        ...prev[sentenceIndex],
        translating: true
      }
    }));

    try {
      const result = await translate(text);
      setSentenceStates(prev => ({
        ...prev,
        [sentenceIndex]: {
          ...prev[sentenceIndex],
          translation: result,
          translating: false
        }
      }));
    } catch (error) {
      setSentenceStates(prev => ({
        ...prev,
        [sentenceIndex]: {
          ...prev[sentenceIndex],
          translating: false
        }
      }));
    }
  };

  const handleSpeakSentence = async (sentenceIndex: number, text: string) => {
    setSentenceStates(prev => ({
      ...prev,
      [sentenceIndex]: {
        ...prev[sentenceIndex],
        speaking: true
      }
    }));
    
    await speak(text);
    
    setSentenceStates(prev => ({
      ...prev,
      [sentenceIndex]: {
        ...prev[sentenceIndex],
        speaking: false
      }
    }));
  };

  const exitStoryMode = () => {
    setIsStoryModeActive(false);
    setStoryContent('');
    setStoryError(null);
    setStorySentences([]);
    setSentenceStates({});
  };

  // --- Story Mode View ---
  const renderStoryView = () => {
    return (
      <div className="mx-auto mt-4 overflow-hidden">
        <div className="mb-4 rounded-[28px] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[21px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
              Story with Your Words
            </h3>
          </div>
        </div>
        
        <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
          <div className="bg-[#1d1d1f] p-4 text-center">
            <h3 className="text-[17px] font-medium tracking-[-0.37px] text-white">
              {isGeneratingStory ? 'Generating a story with your words...' : 'Story Generated!'}
            </h3>
          </div>

          <div className="p-6">
            {storyError ? (
              <div className="rounded-[18px] bg-[#fff1f0] p-3 text-[#8b2b1d]">
                {storyError}
              </div>
            ) : isGeneratingStory ? (
              <div className="flex flex-col items-center justify-center p-8">
                <div 
                  className="prose prose-sm prose-indigo max-w-none overflow-auto"
                  dangerouslySetInnerHTML={{ __html: formatStoryContent(storyContent) }}
                />
                <p className="text-gray-600">...</p>
              </div>
            ) : storySentences.length > 0 ? (
              <div className="prose prose-sm prose-indigo max-w-none overflow-auto">
                {storySentences.map((sentence, index) => {
                  const state = sentenceStates[index] || { translation: '', speaking: false, translating: false };
                  const formattedSentence = sentence.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-indigo-700">$1</strong>');
                  
                  return (
                    <div key={index} className="group relative mb-4 last:mb-0">
                      <div 
                        className="text-slate-800 leading-relaxed prose prose-sm max-w-none pr-20"
                        dangerouslySetInnerHTML={{ __html: formattedSentence.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-indigo-700">$1</strong>') }}
                      />
                      
                      {state.translation && (
                        <div className="mt-2 max-w-none rounded-[18px] bg-[#f5f5f7] p-3 prose prose-sm text-slate-600"
                          dangerouslySetInnerHTML={{ __html: state.translation.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-indigo-700">$1</strong>') }}
                        />
                      )}
                      
                      <div className="absolute right-0 top-0 flex flex-row gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleSpeakSentence(index, sentence)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-gray-600 transition-all duration-200 hover:border-black/20 hover:text-black"
                          title="Text to Speech"
                          disabled={state.speaking}
                        >
                          <span className={state.speaking ? 'inline-block animate-spin-slow' : ''}>
                            {state.speaking ? '⏳' : '🔊'}
                          </span>
                        </button>
                        <button
                          onClick={() => handleTranslateSentence(index, sentence)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-gray-600 transition-all duration-200 hover:border-black/20 hover:text-black"
                          title="Translate"
                          disabled={state.translating}
                        >
                          <span className={state.translating ? 'inline-block animate-spin-slow' : ''}>
                            {state.translating ? '⏳' : '🌐'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div 
                className="prose prose-sm prose-indigo max-w-none overflow-auto"
                dangerouslySetInnerHTML={{ __html: formatStoryContent(storyContent) }}
              />
            )}
          </div>

          {storyContent && !isGeneratingStory && (
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => speak(storyContent.replace(/\*\*([^*]+)\*\*/g, '$1'))}
                disabled={ttsSpeaking || isGeneratingStory}
                className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-50"
              >
                {ttsSpeaking ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Speaking...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                    </svg>
                    Read All Aloud
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };
  // ------------------------

  const renderWordBook = () => {
    return (
      <section className={`rounded-[32px] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.10)] md:p-8 ${practiceSessionSummary ? 'mt-4' : ''}`}>
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0071e3]">Saved Vocabulary</p>
            {/* <h2 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#1d1d1f]">
              Your words, ready to review.
            </h2> */}
            {/* <p className="mt-2 text-[17px] leading-[1.47] tracking-[-0.37px] text-black/72">
              {words.size} saved word{words.size === 1 ? '' : 's'} across reading sessions.
            </p> */}
          </div>
          {/* <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? primaryButtonClass : secondaryButtonClass}
              title="Grid view"
            >
              Grid View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cloud')}
              className={viewMode === 'cloud' ? primaryButtonClass : secondaryButtonClass}
              title="Cloud view"
            >
              Cloud View
            </button>
          </div> */}
          <button 
              onClick={() => startPracticeSession(true)}
              className={primaryButtonClass}
              disabled={currentWordsForDisplay.length === 0}
            >
              Practice
            </button>
        </div>

        <div className="mb-6">{renderProficiencyLegend()}</div>
        
        {words.size === 0 ? (
          <div className="rounded-[28px] bg-[#f5f5f7] px-6 py-14 text-center">
            <h3 className="text-[28px] font-semibold tracking-[0.01em] text-[#1d1d1f]">Your word book is empty.</h3>
            <p className="mx-auto mt-3 max-w-lg text-[17px] leading-[1.47] tracking-[-0.37px] text-black/64">
              Tap any word while reading and it will show up here for review, lookup, and practice.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          newRenderGridView()
        ) : (
          newRenderCloudView()
        )}

        {totalPages > 1 && (
          <div className="flex justify-center mt-4">
            <Paginator currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        )}
      </section>      
    )
  } 

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="w-full pb-8 pt-4 md:pb-12 md:pt-6">
        <header className="mb-6 rounded-[36px] bg-[linear-gradient(135deg,#1f2937_0%,#166534_52%,#0f766e_100%)] px-6 py-8 text-white shadow-[0_24px_70px_rgba(0,0,0,0.18)] md:px-8 md:py-10">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_220px] lg:items-end">
            <div className="max-w-3xl">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-emerald-100/90">Word Book</p>
              <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] md:text-[48px]">Your words, ready to review.</h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-[1.5] tracking-[-0.24px] text-white/72 md:text-[16px]">
                Review saved words, practice pronunciation, and keep your reading progress moving without losing context.
              </p>
            </div>

            <div>
              <div className="rounded-[24px] bg-emerald-100/15 p-3.5 ring-1 ring-emerald-100/30">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/56">Words</p>
                <p className="mt-1.5 text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-white">{wordArray.length}</p>
              </div>
            </div>
          </div>
        </header>
        
        <div className="relative flex min-h-screen w-full flex-col gap-5 xl:flex-row xl:items-start">
          <div className="flex-1">
            <div className="mb-4 flex flex-wrap justify-end gap-2">
              {!isPracticeModeActive && !isStoryModeActive && (
                <>
                  {/* <button 
                    onClick={() => generateStory(true)}
                    className="bg-purple-400 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:shadow-md transition-all duration-150"
                    disabled={currentWordsForDisplay.length === 0}
                  >
                    Make a Story
                  </button> */}
                  {/* <button 
                    onClick={() => startPracticeSession(true)}
                    className={primaryButtonClass}
                    disabled={currentWordsForDisplay.length === 0}
                  >
                    Practice
                  </button> */}
                </>
              )}
              {isPracticeModeActive && (
                <button 
                  onClick={exitPracticeSession}
                  className={darkButtonClass}
                >
                  Exit Practice
                </button>
              )}
              {isStoryModeActive && (
                <button 
                  onClick={exitStoryMode}
                  className={darkButtonClass}
                >
                  Exit Story
                </button>
              )}
            </div>
            
            {isPracticeModeActive && renderPracticeView()}
            {isStoryModeActive && renderStoryView()}
            {!isPracticeModeActive && !isStoryModeActive && renderWordBook()}
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-50 h-[220px] overflow-y-auto border-t border-black/8 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.12)] md:static md:h-auto md:max-h-[calc(100vh-2.5rem)] md:w-full xl:sticky xl:top-6 xl:w-[360px] xl:flex-none xl:overflow-hidden xl:rounded-[32px] xl:border xl:border-black/6 xl:bg-white xl:shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
            <Dictionary selectedWord={selectedWord} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordList;
