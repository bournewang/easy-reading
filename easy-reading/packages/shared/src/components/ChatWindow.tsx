import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Article } from '../types';
import { InteractiveText } from './InteractiveText';
import { AssistantIcon, UserIcon } from './icons/ChatIcons';
import { useTTS } from '../hooks/useTTS';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface ChatWindowProps {
    article: Article;
    onError?: (error: Error) => void;
    onWordClick: (word: string) => void;  // Make it optional
}

type ChatStreamMessage = {
    content?: string;
    message?: string;
    session_id?: string;
    done?: boolean;
};

export function ChatWindow({ article, onError, onWordClick }: ChatWindowProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [articleText, setArticleText] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const { speak, speaking } = useTTS();
    const [lastMessageId, setLastMessageId] = useState<string | null>(null);
    const [streamingMessage, setStreamingMessage] = useState('');

    useEffect(() => {
        if (!article) return;
        const fullText = getFullArticleText(article);
        setArticleText(fullText);
    }, [article]);

    useEffect(() => {
        if (!articleText) return;
        initializeChat();
    }, [articleText]);

    const getFullArticleText = (article: Article): string => {
        // Start with the title
        const textParts = [article.title];

        // Add content from text paragraphs in order
        Object.entries(article.paragraphs)
            .sort(([a], [b]) => Number(a) - Number(b)) // Sort by paragraph number
            .forEach(([_, paragraph]) => {
                if (paragraph.type === 'text') {
                    textParts.push(paragraph.content);
                }
            });

        // Combine all text with proper spacing
        const text = textParts.join('\n\n');
        // console.log("article text: ", text)
        return text
    }; 

    const handleChatStream = async (response: Response, isInitializing: boolean = false) => {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullMessage = '';

        try {
            while (reader) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data: ChatStreamMessage = JSON.parse(line.slice(6));
                            
                            if (data.content) {
                                fullMessage += data.content;
                                setStreamingMessage(prev => prev + data.content);
                            }

                            if (data.done) {
                                const finalMessage = data.message || fullMessage;
                                if (isInitializing && data.session_id) {
                                    setSessionId(data.session_id);
                                }
                                setMessages(prev => [...prev, {
                                    role: 'assistant',
                                    content: finalMessage,
                                    timestamp: Date.now()
                                }]);
                                setStreamingMessage('');
                            }
                        } catch (e) {
                            console.error('Error parsing SSE message:', e);
                        }
                    }
                }
            }
        } catch (error) {
            onError?.(error as Error);
        }
    };

    const initializeChat = async () => {
        const chatUrl = process.env.NEXT_PUBLIC_AI_CHAT_URL || 'http://127.0.0.1:5000/ai/chat';
        if (!chatUrl) {
            throw new Error('Chat URL is not defined');
        }
        try {
            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    article: articleText,
                    type: 'initialize'
                })
            });

            if (!response.ok) throw new Error('Failed to initialize chat');
            
            await handleChatStream(response, true);
        } catch (error) {
            onError?.(error as Error);
        }
    };

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const playLatestMessage = async () => {
            const latestMessage = messages[messages.length - 1];
            if (
                latestMessage && 
                latestMessage.role === 'assistant' &&
                `msg-${latestMessage.timestamp}` !== lastMessageId
            ) {
                setLastMessageId(`msg-${latestMessage.timestamp}`);
                await speak(latestMessage.content);
            }
        };

        if (messages.length > 0) {
            playLatestMessage();
        }
    }, [messages, speak]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMessage: Message = {
            role: 'user',
            content: inputValue.trim(),
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        const chatUrl = process.env.NEXT_PUBLIC_AI_CHAT_URL || 'http://127.0.0.1:5000/ai/chat';
        if (!chatUrl) {
            throw new Error('Chat URL is not defined');
        }
        try {
            const response = await fetch(chatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    messages: [...messages, userMessage],
                    type: 'chat'
                })
            });

            if (!response.ok) throw new Error('Failed to get AI response');

            await handleChatStream(response);
        } catch (error) {
            onError?.(error as Error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(space.20))] border rounded-lg shadow-lg bg-white">
            <div className="p-4 border-b bg-gray-50">
                <h3 className="text-lg font-semibold">Discussion</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.timestamp}
                        className={`flex items-start gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className="max-w-[80%]">
                            <div
                                className={`
                                    relative px-4 py-2
                                    ${message.role === 'user' 
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-t-2xl rounded-l-2xl' 
                                        : 'bg-white border border-gray-200 shadow-sm rounded-t-2xl rounded-r-2xl'
                                    }
                                `}
                            >
                                {message.role === 'assistant' ? (
                                    <InteractiveText 
                                        text={message.content} 
                                        isMarkdown={true}
                                        id={`msg-${message.timestamp}`}
                                        onWordClick={onWordClick}
                                    />
                                ) : (
                                    <div className="text-white">{message.content}</div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Streaming message */}
                {streamingMessage && (
                    <div className="flex justify-start">
                        <div className="max-w-[80%]">
                            <div className="bg-white border border-gray-200 rounded-t-2xl rounded-r-2xl px-4 py-2">
                                <InteractiveText 
                                    text={streamingMessage} 
                                    isMarkdown={true}
                                    id="streaming-message"
                                    onWordClick={onWordClick}
                                />
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Loading indicator (you might want to remove this or show it only before streaming starts) */}
                {isLoading && !streamingMessage && (
                    <div className="flex justify-start">
                        <div className="max-w-[80%]">
                            <div className="bg-white border border-gray-200 rounded-t-2xl rounded-r-2xl p-3">
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-4 mb-12 border-t mt-auto">
                <div className="flex space-x-2">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type your response..."
                        className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-y"
                        disabled={isLoading}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !inputValue.trim()}
                        className="px-4 py-2 h-fit bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
}