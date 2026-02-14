import React from 'react';
import { createRoot } from 'react-dom/client';
import { WordList } from '@easy-reading/shared';

interface Word {
  term: string;
  definition: string;
  date: number; // timestamp
}

// Load saved words from storage
async function loadWords(): Promise<Word[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get('wordlist', (result) => {
      const words = result.wordlist || [];
      resolve(words);
    });
  });
}

// Save words to storage
async function saveWords(words: Word[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ wordlist: words }, () => {
      resolve();
    });
  });
}

// Dynamically load the reader CSS
function loadReaderCSS() {
  if (!document.querySelector('link[href*="reader.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = chrome.runtime.getURL('assets/reader.css');
    document.head.appendChild(link);
    console.log('Reader CSS loaded dynamically');
  }
}

// Initialize the wordlist component
function initWordlist() {
  console.log('Initializing WordList component');
  const container = document.getElementById('wordlist-root');
  
  if (!container) {
    console.error('Could not find wordlist-root element');
    return;
  }
  
  try {
    const root = createRoot(container);
    root.render(React.createElement(WordList));
    console.log('WordList component rendered successfully');
  } catch (error) {
    console.error('Error rendering WordList component:', error);
  }
}

// Start when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Wordlist page loaded');
  loadReaderCSS();
  initWordlist();
}); 