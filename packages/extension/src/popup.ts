document.getElementById('readButton')?.addEventListener('click', () => {
  console.log('readButton clicked');
  chrome.runtime.sendMessage({ action: 'injectReader' }, (response) => {
    console.log('chrome.runtime.sendMessage ', response);
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }
    if (response?.success) {
      window.close();
    } else {
      console.error('Failed to inject reader:', response?.error);
    }
  });
}); 