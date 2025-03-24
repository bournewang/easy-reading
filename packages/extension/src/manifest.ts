import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Easy Reading',
  version: '0.6.0',
  description: 'A browser extension for easy reading of English articles with text-to-speech, bilingual mode, and dictionary.',
  icons: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  action: {
    default_popup: 'src/popup.html',
    default_icon: {
      "16": "icons/icon16.png",
      "24": "icons/icon24.png",
      "32": "icons/icon32.png"
    }
  },
  permissions: ['activeTab', 'scripting', 'storage'],
  // options_page: 'options.html',
  background: {
    service_worker: 'src/background.ts',
    type: 'module'
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content.ts'],
      css: ['assets/reader.css']
    }
  ],
  web_accessible_resources: [{
    resources: ['assets/reader.css'],
    matches: ['<all_urls>']
  }]
}) 