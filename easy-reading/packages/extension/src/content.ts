import React from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Reader, fetchArticle } from '@easy-reading/shared';
import type { Article } from '@easy-reading/shared';

console.log('[Demo Extension] Content script loading...');

console.log('Reader component:', Reader);
console.log('Reader source:', Reader.toString());


// Verify React is available
if (typeof React === 'undefined') {
  throw new Error('React is not loaded');
}

if (typeof ReactDOM === 'undefined') {
  throw new Error('ReactDOM is not loaded');
}

function createOverlay(): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.id = 'reader-overlay';
  
  // Create shadow root
  const shadow = overlay.attachShadow({ mode: 'open' });
  
  // Inject Tailwind styles
  const style = document.createElement('style');
  fetch(chrome.runtime.getURL('assets/reader.css'))
    .then(response => response.text())
    .then(css => {
      style.textContent = css;
    });
  shadow.appendChild(style);
  
  // Create main container in shadow DOM
  const mainContainer = document.createElement('div');
  mainContainer.className = 'bg-white'; // Add Tailwind classes
  mainContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;
  
  shadow.appendChild(mainContainer);
  return overlay;
}

// Update close button to use Tailwind classes
function createCloseButton(overlay: HTMLDivElement): HTMLButtonElement {
  const closeButton = document.createElement('button');
  closeButton.textContent = '✕';
  closeButton.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    background: rgba(0, 0, 0, 0.1);
    border: none;
    font-size: 20px;
    cursor: pointer;
    width: 36px;
    height: 36px;
    line-height: 36px;
    padding: 0;
    color: #4B5563;
    z-index: 10000;
    border-radius: 9999px;
    transition: all 0.2s ease;
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Add hover effect
  closeButton.addEventListener('mouseenter', () => {
    closeButton.style.background = 'rgba(0, 0, 0, 0.2)';
    closeButton.style.color = '#1F2937';
  });
  
  closeButton.addEventListener('mouseleave', () => {
    closeButton.style.background = 'rgba(0, 0, 0, 0.1)';
    closeButton.style.color = '#4B5563';
  });

  closeButton.addEventListener('click', () => {
    overlay.style.display = 'none';
  });
  
  return closeButton;
}

async function injectReader() {
  try {
    // Check if overlay exists
    let overlay = document.getElementById('reader-overlay') as HTMLDivElement;
    if (overlay) {
      overlay.style.display = 'block';
      return;
    }

    overlay = createOverlay();
    document.body.appendChild(overlay);

    // Add close button to shadow DOM
    const closeButton = createCloseButton(overlay);
    overlay.shadowRoot!.querySelector('div')!.appendChild(closeButton);

    // Create container for Reader in shadow DOM
    const container = document.createElement('div');
    container.id = 'reader-container';
    container.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 2rem;
      height: 100%;
      width: 100%;
      box-sizing: border-box;
    `;
    overlay.shadowRoot!.querySelector('div')!.appendChild(container);

    // Get article content and render
    const article: Article = fetchArticle();
    const root = createRoot(container);
    root.render(
      React.createElement(Reader, { article })
    );

  } catch (error) {
    console.error('Error injecting reader:', error);
    alert('Error: ' + (error as Error).message);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startReading') {
    injectReader()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
});

console.log('[Demo Extension] Content script loaded and listening for messages');