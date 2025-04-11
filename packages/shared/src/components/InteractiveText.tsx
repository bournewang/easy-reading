import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown/lib/ast-to-react';
import { useTTS } from '../hooks/useTTS';
import { useWordList } from '../hooks/useWordList';
import { cleanWord } from '../utils/helper';
import { useTranslation } from '../hooks/useTranslation';
// import { useSentenceExtractor } from '../hooks/useSentenceExtractor';
// import '../styles/tailwind.css';

interface InteractiveTextProps {
    text: string;
    id: string;
    isMarkdown: boolean;
    onWordClick: (word: string) => void;
    isVisible?: boolean; // New prop to track visibility
}

interface SentenceState {
    translation: string;
    speaking: boolean;
    translating: boolean;
}

export function InteractiveText({ text, id, isMarkdown, onWordClick, isVisible = true }: InteractiveTextProps) {
    const [sentenceStates, setSentenceStates] = useState<Record<number, SentenceState>>({});
    const [sentences, setSentences] = useState<string[]>([]);
    const [isLoadingSentences, setIsLoadingSentences] = useState(false);
    const [isSplitNeeded, setIsSplitNeeded] = useState(true);
    const { speak } = useTTS();
    const { translate } = useTranslation();
    const { words: wordList, addWord, removeWord } = useWordList();
    // const { extractSentences } = useSentenceExtractor();
    const elementRef = useRef<HTMLDivElement>(null);

    // Reset state when text changes
    useEffect(() => {
        setSentenceStates({});
        setSentences([]);
        setIsSplitNeeded(true);
    }, [text]);

    // Process sentences only when visible and split is needed
    useEffect(() => {
        if (isVisible && isSplitNeeded) {
            const processSentences = async () => {
                setIsLoadingSentences(true);
                try {
                    // const extractedSentences = await extractSentences(text);
                    // if (extractedSentences) {
                    //     setSentences(extractedSentences);
                    // } else {
                        // Fallback to local sentence splitting if API fails
                        setSentences(splitIntoSentencesLocal(text));
                    // }
                } catch (error) {
                    console.error('Failed to extract sentences:', error);
                    setSentences(splitIntoSentencesLocal(text));
                } finally {
                    setIsLoadingSentences(false);
                    setIsSplitNeeded(false);
                }
            };

            processSentences();
        }
    }, [text, isVisible, isSplitNeeded]);

    const handleTranslate = async (sentenceIndex: number, text: string) => {
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

    const handleSpeak = async (sentenceIndex: number, text: string) => {
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

    const handleWordClick = (word: string) => {
        const cleanedWord = cleanWord(word);
        if (wordList.has(cleanedWord)) {
            removeWord(cleanedWord);
        } else {
            addWord(cleanedWord);
        }
        onWordClick(cleanedWord);
    };

    const splitIntoSentencesLocal = (text: string) => {
        // First normalize newlines to spaces to prevent incorrect splits
        const normalizedText = text.replace(/\s+/g, ' ');
        
        // First, protect certain patterns from being split
        const protectedText = normalizedText
            // Protect decimal numbers (including currency)
            .replace(/\$?\d+\.\d+/g, match => match.replace('.', '@DECIMAL@'))
            // Protect ellipsis
            .replace(/\.{3,}/g, '@ELLIPSIS@')
            // Protect common abbreviations with numbers
            .replace(/(No|Chapter|Ch|Vol|v)\.\s*\d+(\.\d+)?/gi, 
                match => match.replace(/\./g, '@DOT@'))
            // Protect common abbreviations followed by period
            .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|i\.e|e\.g|etc|Inc|Ltd|Co|St)\./gi,
                match => match.replace('.', '@ABBR@'))
            // Protect single letter abbreviations (U.S., U.K., etc)
            .replace(/\b([A-Z]\.)+/g,
                match => match.replace(/\./g, '@DOT@'))
            // Mark company abbreviations that can end sentences
            .replace(/\b(Inc|Ltd|Co|Corp|LLC)\./g, '$1@EOS@');

        // Split into sentences while preserving quotes
        const sentences: string[] = [];
        let currentSentence = '';
        let inQuote = false;
        let quoteChar = '';
        
        // Define quotes array using Unicode escape sequences
        const quotes = ['"', '"', "'", "\u201C", "\u201D", "\u2018", "\u2019"];
        
        for (let i = 0; i < protectedText.length; i++) {
            const char = protectedText[i];
            const nextChar = protectedText[i + 1] || '';
            
            // Handle quote marks
            if (quotes.includes(char)) {
                if (!inQuote) {
                    inQuote = true;
                    quoteChar = char;
                } else if (char === quoteChar) {
                    inQuote = false;
                    // Add the closing quote to current sentence
                    currentSentence += char;
                    
                    // If followed by a period, add it to current sentence
                    if (nextChar === '.') {
                        currentSentence += nextChar;
                        i++; // Skip the period in next iteration
                    }
                    
                    // If this is the end of a sentence
                    if (currentSentence.trim()) {
                        sentences.push(currentSentence.trim());
                        currentSentence = '';
                    }
                    continue;
                }
            }
            
            currentSentence += char;
            
            // Check for sentence endings
            const isEndChar = '.!?'.includes(char);
            const isFollowedBySpace = nextChar === ' ' || quotes.includes(nextChar) || !nextChar;
            const isInsideQuoteEnd = inQuote && isEndChar && nextChar === quoteChar;
            
            // Handle normal sentence endings and quoted endings
            if ((!inQuote && isEndChar && isFollowedBySpace) || isInsideQuoteEnd) {
                if (currentSentence.trim()) {
                    // For quoted endings, include the closing quote
                    if (isInsideQuoteEnd) {
                        currentSentence += nextChar;
                        i++; // Skip the closing quote in next iteration
                    }
                    sentences.push(currentSentence.trim());
                    currentSentence = '';
                }
                continue;
            }
        }
        
        // Add any remaining sentence
        if (currentSentence.trim()) {
            sentences.push(currentSentence.trim());
        }

        // Restore the protected patterns and clean up
        return sentences
            .map(sentence => {
                // Restore all protected patterns
                let restored = sentence
                    .replace(/@DECIMAL@/g, '.')
                    .replace(/@ELLIPSIS@/g, '...')
                    .replace(/@DOT@/g, '.')
                    .replace(/@ABBR@/g, '.')
                    .replace(/@EOS@/g, '.')
                    .trim();
                
                // Add period if sentence doesn't end with punctuation or quote
                if (!/[.!?]['"]*$/.test(restored)) {
                    restored += '.';
                }
                return restored;
            })
            .filter(s => s.length > 0);
    };

    const splitTextIntoWords = (text: string) => {
        const textParts = text.split(/(\s+)/);
        return (
            <>
                {textParts.map((word, index) => {
                    const cleanPart = cleanWord(word);
                    if (cleanPart) {
                        return (
                            <span
                                key={index}
                                onClick={() => handleWordClick(word)}
                                className={`cursor-pointer ${
                                    wordList.has(cleanPart)
                                        ? 'bg-yellow-100 hover:bg-yellow-200'
                                        : 'hover:bg-gray-100'
                                } transition-colors duration-200`}
                            >
                                {word}
                            </span>
                        );
                    }
                    return word;
                })}
            </>
        );
    };

    const renderSentence = (sentence: string, index: number) => {
        const state = sentenceStates[index] || { translation: '', speaking: false, translating: false };
        
        return (
            <div key={index} className="group relative mb-4 last:mb-0">
                <div className="text-slate-800 leading-relaxed prose prose-sm max-w-none pr-20">
                    {splitTextIntoWords(sentence)}
                </div>

                {state.translation && (
                    <div className="mt-2 text-slate-600 bg-slate-50 p-2 rounded prose prose-sm max-w-none">
                        {state.translation}
                    </div>
                )}

                <div className="absolute right-0 top-0 flex flex-row gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => handleSpeak(index, sentence)}
                        className="w-7 h-7 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 rounded-full shadow-sm transition-all duration-200"
                        title="Text to Speech"
                    >
                        <span className={state.speaking ? 'inline-block animate-spin-slow' : ''}>
                            {state.speaking ? '⏳' : '🔊'}
                        </span>
                    </button>
                    <button
                        onClick={() => handleTranslate(index, sentence)}
                        className="w-7 h-7 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 rounded-full shadow-sm transition-all duration-200"
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
    };

    // Test cases
    const testCases = [
        "So St. George of England cut off the dreadful head",
        "Mr. Smith went to No. 7 Baker St. He was looking for Dr. Watson.",
        "The price is $3.14. That's a good deal!",
        "He works for Apple Inc. They make great products.",
        "Chapter 3.2 begins here. This is interesting i.e. very good.",
        "First sentence... Second sentence.",
        "The U.S. is a country. The U.K. is another.",
        "I work for ABC Co. Ltd. It's a good company.",
        "This is e.g. a test sentence. And i.e. another one.",
        "St. Patrick's Day is in March.",
        "St. John wrote a book.",
        "“You!” said the Caterpillar contemptuously. “Who are you?”."
    ];

    // Add this temporarily to test
    useEffect(() => {
        testCases.forEach(test => {
            console.log('Original:', test);
            console.log('Split:', splitIntoSentencesLocal(test));
            console.log('---');
        });
    }, []);

    return (
        <div ref={elementRef} className="bg-white p-1 rounded-lg1 shadow-sm1">
            {isLoadingSentences ? (
                <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
                </div>
            ) : isMarkdown ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            ) : isSplitNeeded ? (
                <div className="text-slate-800 leading-relaxed prose prose-sm max-w-none">
                    {text}
                </div>
            ) : (
                <>
                    {sentences.map((sentence, index) => 
                        renderSentence(sentence, index)
                    )}
                </>
            )}
        </div>
    );
}