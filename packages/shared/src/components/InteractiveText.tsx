import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown/lib/ast-to-react';
import { useTTS } from '../hooks/useTTS';
import { useWordList } from '../hooks/useWordList';
import { cleanWord } from '../utils/helper';
import { useTranslation } from '../hooks/useTranslation';
import { splitIntoSentences } from '../utils/sentenceSplitter';
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
                    setSentences(splitIntoSentences(text));
                } catch (error) {
                    console.error('Failed to extract sentences:', error);
                    setSentences([]);
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