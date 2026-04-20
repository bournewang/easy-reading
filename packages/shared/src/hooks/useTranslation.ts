'use client';

import { useState } from 'react';
import { isReaderLimitWarning, setStoredReaderWarning } from '../utils/reader-warning';
import { incrementDailyUsage } from '../utils/daily-usage';
import { useSharedServices } from '../contexts/SharedServicesContext';
import { showToast } from '../utils/toast';

export const useTranslation = () => {
  const [translating, setTranslating] = useState(false);
  const { translation } = useSharedServices();
  const translate = async (text: string): Promise<string> => {
    try {
      setTranslating(true);
      const result = await translation.translate(text, 'Chinese');
      incrementDailyUsage('translation');
      return result;
    } catch (error) {
      console.error('Translation error:', error);
      if (error instanceof Error) {
        if (isReaderLimitWarning(error.message)) {
          setStoredReaderWarning('translation', error.message);
        } else {
          showToast(error.message, { variant: 'error' });
        }
      }
      return '';
    } finally {
      setTranslating(false);
    }
  };

  const translateBatch = async (texts: string[]): Promise<string[]> => {
    try {
      setTranslating(true);
      const result = await translation.translateBatch(texts, 'Chinese');
      incrementDailyUsage('translation');
      return result;
    } catch (error) {
      console.error('Batch translation error:', error);
      if (error instanceof Error) {
        if (isReaderLimitWarning(error.message)) {
          setStoredReaderWarning('translation', error.message);
        } else {
          showToast(error.message, { variant: 'error' });
        }
      }
      return [];
    } finally {
      setTranslating(false);
    }
  };

  return { translate, translateBatch, translating };
};
