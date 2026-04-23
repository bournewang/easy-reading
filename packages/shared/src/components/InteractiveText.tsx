'use client';

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
    vocabularyHighlightColorByWord?: Record<string, string>;
    vocabularyBookIdsByWord?: Record<string, string[]>;
}

interface SentenceState {
    translation: string;
    speaking: boolean;
    translating: boolean;
}

export function InteractiveText({
    text,
    id,
    isMarkdown,
    onWordClick,
    isVisible = true,
    vocabularyHighlightColorByWord = {},
    vocabularyBookIdsByWord = {},
}: InteractiveTextProps) {
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
                        const bookColor = vocabularyHighlightColorByWord[cleanPart];
                        const bookIds = vocabularyBookIdsByWord[cleanPart] || [];
                        const isInWordbook = wordList.has(cleanPart);
                        const primaryBookId = bookIds[0]?.replace(/\.json$/i, '');
                        const extraBookCount = bookIds.length > 1 ? bookIds.length - 1 : 0;
                        const markerLabel = primaryBookId
                            ? extraBookCount > 0
                                ? `${primaryBookId} +${extraBookCount}`
                                : primaryBookId
                            : '';

                        return (
                            <span key={index} className="inline-flex items-start gap-1 align-baseline">
                                <span
                                    onClick={() => handleWordClick(word)}
                                    title={bookIds.length > 0 ? `Vocabulary books: ${bookIds.join(', ')}` : undefined}
                                    className={`cursor-pointer rounded-[6px] px-0.5 transition-colors duration-200 ${
                                        isInWordbook ? 'bg-yellow-100 hover:bg-yellow-200' : 'hover:bg-gray-100'
                                    }`}
                                    style={!isInWordbook && bookColor ? { backgroundColor: bookColor } : undefined}
                                >
                                    {word}
                                </span>
                                {markerLabel ? (
                                    <span
                                        className="mt-0.5 inline-flex max-w-[7rem] shrink-0 rounded-full border border-black/8 bg-white/92 px-1.5 py-[1px] text-[9px] font-semibold leading-[1.2] tracking-[0.04em] text-black/56"
                                        title={bookIds.join(', ')}
                                    >
                                        {markerLabel}
                                    </span>
                                ) : null}
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
            <div key={index} className="group mb-4 flex items-start gap-3 last:mb-0">
                <div className="min-w-0 flex-1">
                    <div className="prose prose-sm max-w-none leading-relaxed text-slate-800">
                        {splitTextIntoWords(sentence)}
                    </div>

                    {state.translation && (
                        <div className="prose prose-sm mt-2 max-w-none rounded bg-slate-50 p-2 text-slate-600">
                            {state.translation}
                        </div>
                    )}
                </div>

                <div className="flex w-[68px] shrink-0 justify-end">
                    <div className="flex flex-row gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                            onClick={() => handleSpeak(index, sentence)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:text-gray-800"
                            title="Text to Speech"
                        >
                            <span className={state.speaking ? 'inline-block animate-spin-slow' : ''}>
                                {state.speaking ? '⏳' : '🔊'}
                            </span>
                        </button>
                        <button
                            onClick={() => handleTranslate(index, sentence)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:text-gray-800"
                            title="Translate"
                            disabled={state.translating}
                        >
                            <span className={state.translating ? 'inline-block animate-spin-slow' : ''}>
                                {state.translating ? '⏳' : '🌐'}
                            </span>
                        </button>
                    </div>
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
