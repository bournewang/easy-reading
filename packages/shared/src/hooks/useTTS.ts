import { useState } from 'react';
import { useSharedServices } from '../contexts/SharedServicesContext';

export const useTTS = () => {
  const [speaking, setSpeaking] = useState(false);
  const { tts } = useSharedServices();

  const speak = async (text: string) => {
    try {
      setSpeaking(true);
      await tts.speak(text);
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setSpeaking(false);
    }
  };

  return { speak, speaking };
};
