import { useState } from 'react';
import { useSharedServices } from '../contexts/SharedServicesContext';

export const useTranslation = () => {
  const [translating, setTranslating] = useState(false);
  const { translation } = useSharedServices();
  const translate = async (text: string): Promise<string> => {
    try {
      setTranslating(true);
      return await translation.translate(text, 'Chinese');
    } catch (error) {
      console.error('Translation error:', error);
      return '';
    } finally {
      setTranslating(false);
    }
  };

  const translateBatch = async (texts: string[]): Promise<string[]> => {
    try {
      setTranslating(true);
      return await translation.translateBatch(texts, 'Chinese');
    } catch (error) {
      console.error('Batch translation error:', error);
      return [];
    } finally {
      setTranslating(false);
    }
  };

  return { translate, translateBatch, translating };
};
