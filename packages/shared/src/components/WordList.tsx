import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWordList } from '../hooks/useWordList';
import { useWordPractice, WordPractice } from '../hooks/useWordPractice';
import { useTTS } from '../hooks/useTTS';
import Dictionary from './Dictionary';
import {Paginator} from './Paginator';
import { api } from '../utils/api';
import '../styles/tailwind.css';

function WordList() {
  const { words, removeWord } = useWordList();
  const { practiceData, getPracticeStats, recordAttempt } = useWordPractice();
  const { speak, speaking: ttsSpeaking } = useTTS();
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

  const wordArray = Array.from(words);
  const totalPages = Math.ceil(wordArray.length / itemsPerPage);

  const isFirstWordOfCurrentSessionRef = useRef(true);

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
      alert("Please add some words to your list first!");
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

    if (isCloudView) {
        const fontSize = Math.random() * (1.5 - 0.8) + 0.8;
        const rotation = Math.random() * 20 - 10;
        return (
            <button
              key={word}
              className={`group inline-flex items-center ${proficiencyColor}`}
              style={{ transform: `rotate(${rotation}deg)`, fontSize: `${fontSize}rem` }}
              onClick={() => setSelectedWord(word)}
            >
              <span className={`px-3 py-1 rounded-full transition-colors duration-200 ${selectedWord === word ? 'ring-2 ring-indigo-500' : ''}`}>
                {word}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeWord(word); }}
                className="ml-1 opacity-0 group-hover:opacity-100 w-4 h-4 inline-flex items-center justify-center rounded-full bg-red-100 text-red-600 text-xs hover:bg-red-200 hover:text-red-700 transition-all"
                title="Remove word"
              >
                ✕
              </button>
            </button>
        );
    }
    return (
      <div
        key={word}
        className={`group flex items-center justify-between p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border-t border-l border-r border-gray-100 ${proficiencyColor}`}
      >
        <button
          className="flex-1 text-left font-medium hover:text-indigo-600 transition-colors"
          onClick={() => setSelectedWord(word)}
        >
          {word}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); removeWord(word); }}
          className="ml-1 opacity-0 group-hover:opacity-100 w-4 h-4 inline-flex items-center justify-center rounded-full bg-red-100 text-red-600 text-xs hover:bg-red-200 hover:text-red-700 transition-all"
          title="Remove word"
        >
          ✕
        </button>
      </div>
    );
  };

  const renderProficiencyLegend = () => (
    <div className="mb-4 p-3 bg-white/50 rounded-lg shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Proficiency Levels:</h3>
      <div className="flex flex-wrap gap-2">
        {proficiencyConfig.filter(config => config.tier !== '').map(config => (
          <div key={config.tier} className={`flex items-center px-3 py-1 rounded-lg ${config.classes}`}>
            <span className="text-xs">{config.tier} ({config.range})</span>
          </div>
        ))}
      </div>
    </div>
  );

  const newRenderGridView = () => (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {currentWordsForDisplay.map(word => renderWordItem(word))}
      </div>
    </>
  );

  const newRenderCloudView = () => (
    <>
      <div className="min-h-[300px] flex flex-wrap gap-3 justify-center items-center p-4">
        {currentWordsForDisplay.map(word => renderWordItem(word, true))} 
      </div>
    </>
  );

  // --- Practice Mode View ---
  const renderPracticeView = () => {
    if (practiceSessionSummary) {
        return (
            <div className="w-full max-w-md mx-auto mt-8 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-xl text-center">
                <div className="mb-4 text-3xl">🎓</div>
                <h3 className="text-2xl font-semibold text-indigo-700 mb-4">Practice Completed!</h3>
                <p className="text-gray-700 mb-2">Words Practiced: {practiceSessionSummary.wordsPracticed}</p>
                <p className="text-sm text-gray-500 mb-6">(Keep practicing to improve your proficiency)</p>
                <button 
                    onClick={() => { setIsPracticeModeActive(false); setPracticeSessionSummary(null); }}
                    className="mt-2 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg">
                    Back to Word List
                </button>
            </div>
        );
    }
    
    const noWordsToPractice = practiceWords.length === 0 && isPracticeModeActive;
    const practiceFinished = currentPracticeIndex >= practiceWords.length && practiceWords.length > 0;

    if (noWordsToPractice) {
        return (
            <div className="w-full max-w-md mx-auto mt-8 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-xl text-center">
                <div className="text-3xl mb-4">📝</div>
                <p className="text-gray-700 mb-4">Your word list is empty. Add some words to practice!</p>
                <button 
                    onClick={() => setIsPracticeModeActive(false)} 
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg">
                    Back to Word List
                </button>
            </div>
        );
    }

    if (practiceFinished) {
         if(practiceFeedback.includes("completed") || practiceFeedback.includes("end")) {
            return (
                <div className="w-full max-w-md mx-auto mt-8 p-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-xl text-center">
                    <div className="text-4xl mb-6">🎉</div>
                    <h3 className="text-2xl font-semibold text-green-600 mb-4">Practice Complete!</h3>
                    <p className="text-gray-700 mb-6">{practiceFeedback}</p>
                    <button 
                        onClick={exitPracticeSession}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg">
                        View Summary & Exit
                    </button>
                </div>
            );
        }
        return <div className="text-center py-12"><p className="text-gray-500">Session ended or loading issue...</p></div>;
    }

    const currentWordToPractice = practiceWords[currentPracticeIndex];

    return (
      <div className="max-w-md mx-auto mt-4 overflow-hidden">
        {/* Progress bar */}
        <div className="bg-white rounded-xl shadow-md mb-4 p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-indigo-700">
              Practice Session
            </h3>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-1 rounded-full">
              {currentPracticeIndex + 1} of {practiceWords.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${((currentPracticeIndex + 1) / practiceWords.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        {/* Main practice card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Audio section */}
          <div className="bg-indigo-200 p-6 text-center">
            <button 
              onClick={handlePlayCurrentWordAudio} 
              disabled={ttsSpeaking || !currentWordToPractice}
              className="bg-white/90 hover:bg-white text-indigo-700 font-semibold py-3 px-6 rounded-full transition-all duration-200 disabled:opacity-50 flex items-center justify-center mx-auto shadow-md hover:shadow-lg disabled:cursor-not-allowed"
            >
              {ttsSpeaking ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Speaking...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
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
              className={`mb-4 p-4 rounded-lg flex items-center justify-center min-h-[60px] border-0 transition-all duration-200 cursor-pointer ${
                isWordRevealed 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium'
                  : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
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
                <div className="text-2xl font-semibold">{currentWordToPractice}</div>
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
              <label htmlFor="practice-input" className="block text-sm font-medium text-gray-700 mb-1">
                Type what you hear:
              </label>
              <input 
                id="practice-input"
                ref={practiceInputRef}
                type="text" 
                value={practiceInputValue}
                onChange={(e) => setPracticeInputValue(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="Type the word..."
                autoFocus
                disabled={ttsSpeaking || (practiceFeedback.startsWith('Correct') && !isWordRevealed)}
                onFocus={(e) => e.target.select()}
              />
            </form>

            {/* Feedback area */}
            {practiceFeedback && (
              <div className={`mb-4 p-3 rounded-lg text-center font-medium ${
                practiceFeedback.startsWith('Correct') 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {practiceFeedback}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button 
                onClick={handlePracticeNextWord} 
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={ttsSpeaking}
              >
                Skip / Next
              </button>
              <button
                onClick={exitPracticeSession}
                className="flex-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 font-medium py-2 px-4 rounded-lg transition-all"
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
    let accumulatedContent = '';
    
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
        onDownloadProgress: (progressEvent) => {
          // Access the partial text response
          if (progressEvent.event && progressEvent.event.target) {
            const xhr = progressEvent.event.target as XMLHttpRequest;
            const newData = xhr.responseText;
            
            // Track previous length to find only new content
            const prevProcessedLength = accumulatedContent.length;
            
            // Process the SSE data
            const lines = newData.split('\n');
            let hasNewContent = false;
            
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

  // Format the story content by converting markdown to HTML
  const formatStoryContent = (content: string) => {
    // Bold text (convert **word** to <strong>word</strong>)
    return content.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-indigo-700">$1</strong>');
  };

  const exitStoryMode = () => {
    setIsStoryModeActive(false);
    setStoryContent('');
    setStoryError(null);
  };

  // --- Story Mode View ---
  const renderStoryView = () => {
    return (
      <div className="mx-auto mt-4 overflow-hidden">
        <div className="bg-white rounded-xl shadow-md mb-4 p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-indigo-700">
              Story with Your Words
            </h3>
            {/* <button
              onClick={exitStoryMode}
              className="bg-red-400 hover:bg-red-600 text-white text-xs font-semibold py-1 px-2 rounded-lg transition-all duration-150"
            >
              Exit
            </button> */}
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-indigo-200 p-3 text-center">
            <h3 className="font-medium text-indigo-700">
              {isGeneratingStory ? 'Generating a story with your words...' : 'Story Generated!'}
            </h3>
          </div>

          <div className="p-6">
            {storyError ? (
              <div className="p-3 bg-red-100 text-red-800 rounded-lg">
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
            ) : (
              <div 
                className="prose prose-sm prose-indigo max-w-none overflow-auto"
                dangerouslySetInnerHTML={{ __html: formatStoryContent(storyContent) }}
              />
            )}
          </div>

          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => speak(storyContent.replace(/\*\*([^*]+)\*\*/g, '$1'))}
              disabled={!storyContent || ttsSpeaking || isGeneratingStory}
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
                  Read Aloud
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };
  // ------------------------

  const renderWordBook = () => {
    return (
      <div className={`bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl ${practiceSessionSummary ? 'mt-4' : ''}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Saved Words <span className="text-sm text-gray-500">({words.size})</span>
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${ viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Grid view"
            >
              Grid ⊞
            </button>
            <button
              onClick={() => setViewMode('cloud')}
              className={`p-2 rounded-lg transition-colors ${ viewMode === 'cloud' ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`}
              title="Cloud view"
            >
              Cloud ☁️
            </button>
          </div>
        </div>

        {renderProficiencyLegend()}
        
        {words.size === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📚</div>
            <p className="text-gray-500">
              Your word list is empty.
              <br />
              <span className="text-sm">Click on words while reading to add them to your list.</span>
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
      </div>      
    )
  } 

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="container mx-auto p-2">
        <header className="flex justify-between items-center py-2">
          <div className="text-left">
            <h1 className="text-3xl font-bold text-indigo-900 mb-1">Word Book</h1>
            <p className="text-gray-600 text-sm">Track and review your learning progress</p>
          </div>
        </header>
        
        <div className="flex flex-col md:flex-row gap-4 relative min-h-screen w-full">
          <div className="flex-1 mb-4 md:mb-0">
            <div className="flex justify-end gap-2 mb-4">
              {!isPracticeModeActive && !isStoryModeActive && (
                <>
                  <button 
                    onClick={() => generateStory(true)}
                    className="bg-purple-400 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:shadow-md transition-all duration-150"
                    disabled={currentWordsForDisplay.length === 0}
                  >
                    Make a Story
                  </button>
                  <button 
                    onClick={() => startPracticeSession(true)}
                    className="bg-blue-400 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:shadow-md transition-all duration-150"
                    disabled={currentWordsForDisplay.length === 0}
                  >
                    Practice
                  </button>
                </>
              )}
              {isPracticeModeActive && (
                <button 
                  onClick={exitPracticeSession}
                  className="bg-red-400 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:shadow-md transition-all duration-150"
                >
                  Exit Practice
                </button>
              )}
              {isStoryModeActive && (
                <button 
                  onClick={exitStoryMode}
                  className="bg-red-400 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:shadow-md transition-all duration-150"
                >
                  Exit Story
                </button>
              )}
            </div>
            
            {isPracticeModeActive && renderPracticeView()}
            {isStoryModeActive && renderStoryView()}
            {!isPracticeModeActive && !isStoryModeActive && renderWordBook()}
          </div>

          <div className={`fixed md:sticky bottom-0 md:top-0 left-0 right-0 md:w-1/3 h-[200px] md:h-screen bg-white md:bg-slate-50 overflow-y-auto border-t border-slate-200 md:border-l md:border-t-0 shadow-lg md:shadow-none z-50`}>
            <Dictionary selectedWord={selectedWord} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordList;