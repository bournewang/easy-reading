import { useState, useEffect, useCallback } from 'react';

const PRACTICE_STORAGE_KEY = 'wordPracticeData';

// Define proficiency tiers
const PROFICIENCY_TIERS = {
  NOVICE: { min: 0, max: 20, label: 'Novice' },
  BEGINNER: { min: 20, max: 40, label: 'Beginner' },
  INTERMEDIATE: { min: 40, max: 60, label: 'Intermediate' },
  ADVANCED: { min: 60, max: 80, label: 'Advanced' },
  MASTER: { min: 80, max: 100, label: 'Master' }
} as const;

// Constants for proficiency calculation
const CORRECT_INCREMENT = 20; // +20% for correct
const WRONG_PENALTY = 10;     // -10% for wrong
const MAX_PROFICIENCY = 100;
const MIN_PROFICIENCY = 0;

const calculateProficiency = (currentProficiency: number, isCorrect: boolean): number => {
  if (isCorrect) {
    // For correct answers, increase by 20% but don't exceed 100%
    return Math.min(currentProficiency + CORRECT_INCREMENT, MAX_PROFICIENCY);
  } else {
    // For wrong answers, decrease by 10% but don't go below 0%
    return Math.max(currentProficiency - WRONG_PENALTY, MIN_PROFICIENCY);
  }
};

const getProficiencyTier = (proficiency: number): string => {
  for (const [tier, { min, max, label }] of Object.entries(PROFICIENCY_TIERS)) {
    if (proficiency >= min && proficiency < max) {
      return label;
    }
  }
  return PROFICIENCY_TIERS.MASTER.label; // Default to Master if somehow above 100
};

export interface WordPractice {
  word: string;
  correctCount: number;
  wrongCount: number;
  lastPracticed: string | null; // ISO string for date
  proficiency: number; // 0-100
  tier: string; // Added tier information
}

export interface PracticeData {
  [word: string]: WordPractice;
}

export const useWordPractice = () => {
  const [practiceData, setPracticeData] = useState<PracticeData>(() => {
    try {
      const storedData = localStorage.getItem(PRACTICE_STORAGE_KEY);
      return storedData ? JSON.parse(storedData) : {};
    } catch (error) {
      console.error('Error loading practice data from localStorage:', error);
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(practiceData));
    } catch (error) {
      console.error('Error saving practice data to localStorage:', error);
    }
  }, [practiceData]);

  const getPracticeStats = useCallback((word: string): WordPractice => {
    if (practiceData[word]) {
      return practiceData[word];
    }
    // Initialize if not found
    return {
      word,
      correctCount: 0,
      wrongCount: 0,
      lastPracticed: null,
      proficiency: 0,
      tier: PROFICIENCY_TIERS.NOVICE.label
    };
  }, [practiceData]);

  const recordAttempt = useCallback((word: string, isCorrect: boolean) => {
    setPracticeData(prevData => {
      const currentStats = prevData[word] || {
        word,
        correctCount: 0,
        wrongCount: 0,
        lastPracticed: null,
        proficiency: 0,
        tier: PROFICIENCY_TIERS.NOVICE.label
      };

      const newCorrectCount = currentStats.correctCount + (isCorrect ? 1 : 0);
      const newWrongCount = currentStats.wrongCount + (!isCorrect ? 1 : 0);
      const newProficiency = calculateProficiency(currentStats.proficiency, isCorrect);
      const newTier = getProficiencyTier(newProficiency);

      return {
        ...prevData,
        [word]: {
          ...currentStats,
          correctCount: newCorrectCount,
          wrongCount: newWrongCount,
          lastPracticed: new Date().toISOString(),
          proficiency: newProficiency,
          tier: newTier
        },
      };
    });
  }, []);
  
  const resetWordPractice = useCallback((word: string) => {
    setPracticeData(prevData => {
      const { [word]: _, ...rest } = prevData;
      return rest;
    });
  }, []);

  const resetAllPracticeData = useCallback(() => {
    setPracticeData({});
  }, []);


  return {
    practiceData,
    getPracticeStats,
    recordAttempt,
    resetWordPractice,
    resetAllPracticeData,
  };
}; 