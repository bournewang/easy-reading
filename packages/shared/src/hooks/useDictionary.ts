import { useCallback, useState } from 'react';
import type { DictResponse } from '../types';
// import { api } from '../utils/api';
import axios from 'axios';

export const useDictionary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupWord = useCallback(async (word: string): Promise<DictResponse> => {
    try {
      setLoading(true);
      setError(null);
      const DICT_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/'
      const response = await axios.get<DictResponse[]>(`${DICT_URL}${word}`);
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