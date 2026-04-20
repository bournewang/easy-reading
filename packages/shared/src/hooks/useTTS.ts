'use client';

import { useState } from 'react';
import { isReaderLimitWarning, setStoredReaderWarning } from '../utils/reader-warning';
import { incrementDailyUsage } from '../utils/daily-usage';
import { useSharedServices } from '../contexts/SharedServicesContext';
import { showToast } from '../utils/toast';

export const useTTS = () => {
  const [speaking, setSpeaking] = useState(false);
  const { tts } = useSharedServices();

  const speak = async (text: string) => {
    try {
      setSpeaking(true);
      await tts.speak(text);
      incrementDailyUsage('tts');
    } catch (error) {
      console.error('TTS error:', error);
      if (error instanceof Error) {
        if (isReaderLimitWarning(error.message)) {
          setStoredReaderWarning('tts', error.message);
        } else {
          showToast(error.message, { variant: 'error' });
        }
      }
    } finally {
      setSpeaking(false);
    }
  };

  return { speak, speaking };
};
