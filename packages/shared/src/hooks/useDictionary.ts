import { useCallback, useState } from 'react';
import type { DictResponse } from '../types';
import { api } from '../utils/api';

export const useDictionary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupWord = useCallback(async (word: string): Promise<DictResponse> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<DictResponse[]>(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      return response.data[0];
    } catch (error) {
      const errorMessage = `Failed to lookup word: ${word}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []); // Removed api from dependencies

  return {
    lookupWord,
    loading,
    error
  };
};