import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/storage';
import type { Settings } from '../types';
import { defaultSettings } from '../types/settings';

export const SettingsContext = createContext<{
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
} | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = storage.get<Partial<Settings> | null>('settings', null);
    return { ...defaultSettings, ...(stored || {}) };
  });

  useEffect(() => {
    storage.set('settings', settings);
  }, [settings]);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};