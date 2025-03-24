import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown/lib/ast-to-react';
import { useTTS } from '../hooks/useTTS';
import { useWordList } from '../hooks/useWordList';
import { cleanWord } from '../utils/helper';
import { useTranslation } from '../hooks/useTranslation';
// import '../styles/tailwind.css';

interface InteractiveTextProps {
    text: string;
    id: string;
    isMarkdown: boolean;
    onWordClick: (word: string) => void;
}

export function InteractiveText({ text, id, isMarkdown, onWordClick }: InteractiveTextProps) {
    const [translation, setTranslation] = useState<string>('');
    const [speakingId, setSpeakingId] = useState<string | null>(null);
    const { speak, speaking } = useTTS();
    const { translating, translate } = useTranslation();
    const { words: wordList, addWord, removeWord } = useWordList();  // renamed to wordList

    const handleTranslate = async () => {
        if (translation) return;
        const result = await translate(text);
        setTranslation(result);
    };

    const handleSpeak = async () => {
        setSpeakingId(id);
        await speak(text);
        setSpeakingId(null);
    };

    const handleWordClick = (word: string) => {
        console.log('Clicked word:', word);
        const cleanedWord = cleanWord(word);
        if (wordList.has(cleanedWord)) {
            removeWord(cleanedWord);
        } else {
            addWord(cleanedWord);
        }

        onWordClick(cleanedWord);
    };

    const splitText = (text: string) => {
        const textParts = text.split(/(\s+)/);  // renamed from words to textParts
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
                                    wordList.has(cleanPart)  // using wordList instead of words
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

    return (
        <div className="group relative bg-white pr-8 sm:pr-12 shadow1-sm hover:shadow1-md transition1-shadow">
            <div className="text-slate-800 leading-relaxed prose prose-sm max-w-none">
                {isMarkdown ? (
                    <ReactMarkdown>{text}</ReactMarkdown> 
                    ) : 
                    <>{splitText(text)}</>
                }
            </div>

            {translation && (
                <div className="mt-2 text-slate-600 bg-slate-50 p-2 rounded prose prose-sm max-w-none">
                    {isMarkdown ? (
                        <ReactMarkdown>{translation}</ReactMarkdown>
                    ) : translation}
                </div>
            )}

            <div className="absolute right-0 top-0 flex flex-col">
                <button
                    onClick={handleSpeak}
                    className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 rounded-full shadow-sm transition-all duration-200"
                    title="Text to Speech"
                >
                    <span className={speaking && speakingId === id ? 'inline-block animate-spin-slow' : ''}>
                        {speaking && speakingId === id ? '⏳' : '🔊'}
                    </span>
                </button>
                <button
                    onClick={handleTranslate}
                    className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-800 rounded-full shadow-sm transition-all duration-200"
                    title="Translate"
                >
                    <span className={translating ? 'inline-block animate-spin-slow' : ''}>
                        {translating ? '⏳' : '🌐'}
                    </span>
                </button>
            </div>
        </div>
    );
}