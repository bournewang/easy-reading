import { build } from 'vite';
import { resolve } from 'path';
import fs from 'fs-extra';

async function buildExtension() {
  try {
    const rootDir = process.cwd();
    const distDir = resolve(rootDir, 'dist');
    const sharedPackageDir = resolve(rootDir, '../shared');

    // Clean dist
    await fs.remove(distDir);
    await fs.ensureDir(distDir);
    await fs.ensureDir(resolve(distDir, 'assets'));

    // Build extension
    await build();

    // Copy manifest
    await fs.copy(
      resolve(rootDir, 'public/manifest.json'),
      resolve(distDir, 'manifest.json')
    );

    // Copy React and ReactDOM
    await fs.copy(
      resolve(rootDir, 'node_modules/react/umd/react.production.min.js'),
      resolve(distDir, 'assets/react.production.min.js')
    );
    await fs.copy(
      resolve(rootDir, 'node_modules/react-dom/umd/react-dom.production.min.js'),
      resolve(distDir, 'assets/react-dom.production.min.js')
    );

    // Copy Reader's CSS from shared package
    await fs.copy(
      resolve(sharedPackageDir, 'dist/styles/reader.css'),
      resolve(distDir, 'assets/reader.css')
    );

    // Move popup files
    const popupHtmlPath = resolve(distDir, 'src/popup/index.html');
    if (await fs.pathExists(popupHtmlPath)) {
      await fs.move(popupHtmlPath, resolve(distDir, 'popup.html'));
    }

    // Clean up unnecessary directories
    const srcDir = resolve(distDir, 'src');
    if (await fs.pathExists(srcDir)) {
      await fs.remove(srcDir);
    }

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildExtension();