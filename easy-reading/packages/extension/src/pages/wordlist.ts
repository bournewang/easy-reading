import React from 'react';
import { createRoot } from 'react-dom/client';
import { WordList } from '@english-reader/shared';

const container = document.getElementById('wordList')!;
const root = createRoot(container);
root.render(React.createElement(WordList));