import { useState } from 'react';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

interface TTSConfig {
  region: string;
  key: string;
}

export const useTTS = () => {
  const [speaking, setSpeaking] = useState(false);
  const config: TTSConfig = {
    region: process.env.NEXT_PUBLIC_TTS_LOCATION || '',
    key:    process.env.NEXT_PUBLIC_TTS_API_KEY || '',
  };

  const speak = async (text: string) => {
    try {
      setSpeaking(true);
      const speechConfig = sdk.SpeechConfig.fromSubscription(config.key, config.region);
      
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig);
      await new Promise((resolve, reject) => {
        synthesizer.speakTextAsync(
          text,
          result => {
            synthesizer.close();
            resolve(result);
          },
          error => {
            synthesizer.close();
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setSpeaking(false);
    }
  };

  return { speak, speaking };
};