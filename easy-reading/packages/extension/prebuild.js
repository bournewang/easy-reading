import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create public/assets directory if it doesn't exist
const assetsDir = path.join(__dirname, 'public', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Copy reader.css from shared package to public/assets
const sourceCss = path.join(__dirname, '../shared/dist/styles/reader.css');
const targetCss = path.join(__dirname, 'public/assets/reader.css');

try {
  fs.copyFileSync(sourceCss, targetCss);
  console.log('Successfully copied reader.css to public/assets');
} catch (error) {
  console.error('Error copying reader.css:', error);
} 