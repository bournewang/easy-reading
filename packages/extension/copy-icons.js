import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source and destination directories
const iconsDir = path.join(__dirname, 'public', 'assets', 'images');
const destIconsDir = path.join(__dirname, 'dist', 'icons');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destIconsDir)) {
  fs.mkdirSync(destIconsDir, { recursive: true });
  console.log(`Created icons directory: ${destIconsDir}`);
}

// Copy all icon files
try {
  const iconFiles = fs.readdirSync(iconsDir);
  
  iconFiles.forEach(file => {
    const sourcePath = path.join(iconsDir, file);
    const destPath = path.join(destIconsDir, file);
    
    // Only copy files, not directories
    if (fs.statSync(sourcePath).isFile()) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied icon: ${file}`);
    }
  });
  
  console.log('All icons copied successfully');
} catch (error) {
  console.error('Error copying icons:', error);
} 