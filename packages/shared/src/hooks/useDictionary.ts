import { useCallback, useState } from 'react';
import type { DictResponse } from '../types';
import { useSharedServices } from '../contexts/SharedServicesContext';

export const useDictionary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dictionary } = useSharedServices();

  const lookupWord = useCallback(async (word: string): Promise<DictResponse> => {
    try {
      setLoading(true);
      setError(null);
      return await dictionary.lookupWord(word);
    } catch (error) {
      const errorMessage = `Failed to lookup word: ${word}`;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [dictionary]);

  return {
    lookupWord,
    loading,
    error
  };
};
