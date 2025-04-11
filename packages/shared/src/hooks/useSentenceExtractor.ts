import { useState, useCallback } from 'react';

interface SentenceExtractorResponse {
  sentences: string[];
}

export const useSentenceExtractor = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractSentences = useCallback(async (text: string): Promise<string[] | null> => {
    // For very short texts, just return the text as a single sentence
    if (text.length < 10) {
      return [text];
    }
    
    setLoading(true);
    setError(null);

    try {
      const EXTRACT_URL = process.env.NEXT_PUBLIC_SENTENCE_EXTRACTOR_URL || 'http://localhost:8020';
      
      const response = await fetch(`${EXTRACT_URL}/split-sentences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Failed to extract sentences: ${response.statusText}`);
      }

      const data = await response.json();
      return data.sentences;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract sentences';
      setError(message);
      console.error('[DEBUG] Extract error:', message);
      
      // Fallback to simple handling
      return text.split(/(?<=[.!?])\s+/)
        .filter(s => s.trim().length > 0)
        .map(s => s.trim());
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    extractSentences,
    loading,
    error
  };
}; 