const fs = require('fs');
const path = require('path');

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, 'dist', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Copy reader.css from shared package
const sourceCss = path.join(__dirname, '../shared/dist/styles/reader.css');
const targetCss = path.join(__dirname, 'dist/assets/reader.css');

try {
  fs.copyFileSync(sourceCss, targetCss);
  console.log('Successfully copied reader.css to extension assets');
} catch (error) {
  console.error('Error copying reader.css:', error);
} 