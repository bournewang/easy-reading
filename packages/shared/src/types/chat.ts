export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface ChatResponse {
    message: string;
    corrections?: {
        original: string;
        corrected: string;
        explanation: string;
    }[];
}

export interface ChatRequest {
    article: string;
    messages?: ChatMessage[];
    type: 'initialize' | 'chat';
} 