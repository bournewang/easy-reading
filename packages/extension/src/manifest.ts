import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'Easy Reading',
  version: '0.3.1',
  description: 'A browser extension for easy reading of web pages',
  permissions: ['activeTab', 'scripting'],
  action: {
    default_popup: 'src/popup.html'
  },
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