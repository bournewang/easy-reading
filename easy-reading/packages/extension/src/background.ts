import { Reader, Article, fetchArticle } from '@easy-reading/shared';

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'injectReader') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }
      
      try {
        // First, inject the content script
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['src/content.js']
        });

        // Then, send a message to the content script to start reading
        chrome.tabs.sendMessage(tabs[0].id, { action: 'startReading' }, (response) => {
          sendResponse(response);
        });

      } catch (error) {
        console.error('Failed to inject content script:', error);
        sendResponse({ success: false, error: error.message });
      }
    });
    return true; // Will respond asynchronously
  }
}); 