import { useState } from 'react';
import { api } from '../utils/api';
import axios from 'axios';
import { ApiResponse } from '../types';
export const useTranslation = () => {
  const [translating, setTranslating] = useState(false);

  const TRANS_API = process.env.NEXT_PUBLIC_TRANS_API || '';
  const translate = async (text: string): Promise<string> => {
    try {
      setTranslating(true);
      // const response = await api.post<ApiResponse>('/translate/text', {
      const response = await axios.post<ApiResponse>(TRANS_API, {
        text,
        target_lang: 'Chinese'
      });
      return (response.data.data as string) || '';
    } catch (error) {
      console.error('Translation error:', error);
      return '';
    } finally {
      setTranslating(false);
    }
  };

  const translateBatch = async (texts: string[]): Promise<string[]> => {
    try {
      const text = texts.join('\n');
      setTranslating(true);
      // const response = await api.post<ApiResponse>('/translate/text', {
        const response = await axios.post<ApiResponse>(TRANS_API, {
        text,
        target_lang: 'Chinese'
      });
      const string = (response.data.data as string) || "";
      const array = string.split('\n');
      return array;
    } catch (error) {
      console.error('Batch translation error:', error);
      return [];
    } finally {
      setTranslating(false);
    }
  };

  return { translate, translateBatch, translating };
};