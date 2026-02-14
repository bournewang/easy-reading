import React from 'react';
import { createRoot } from 'react-dom/client';
import { WordList } from '@easy-reading/shared';

const container = document.getElementById('options')!;
const root = createRoot(container);
root.render(React.createElement(WordList));