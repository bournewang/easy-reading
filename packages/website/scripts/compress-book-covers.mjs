#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 640;
const DEFAULT_QUALITY = 82;

function parseArgs(argv) {
  const options = {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    quality: DEFAULT_QUALITY,
    dir: null,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--dir') {
      options.dir = argv[index + 1] || null;
      index += 1;
      continue;
    }

    if (arg === '--width') {
      options.width = Number(argv[index + 1] || DEFAULT_WIDTH);
      index += 1;
      continue;
    }

    if (arg === '--height') {
      options.height = Number(argv[index + 1] || DEFAULT_HEIGHT);
      index += 1;
      continue;
    }

    if (arg === '--quality') {
      options.quality = Number(argv[index + 1] || DEFAULT_QUALITY);
      index += 1;
    }
  }

  return options;
}

function showHelp() {
  console.log(`Compress book covers with ImageMagick.

Usage:
  node ./scripts/compress-book-covers.mjs [--dir <path>] [--width <px>] [--height <px>] [--quality <1-100>] [--dry-run]

Defaults:
  --width 480
  --height 640
  --quality 82

Behavior:
  - finds covers under public/books/cover first, then public/books/covers
  - auto-orients images
  - resizes/crops to an exact 3:4 cover
  - strips metadata
  - overwrites the original file in place
`);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveCoversDir(explicitDir) {
  if (explicitDir) {
    return path.isAbsolute(explicitDir) ? explicitDir : path.resolve(process.cwd(), explicitDir);
  }

  const candidates = [
    path.resolve(process.cwd(), 'public/cover'),
    path.resolve(process.cwd(), 'public/covers'),
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  throw new Error('Could not find public/cover or public/covers.');
}

async function collectImageFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(dirPath, entry.name))
    .sort();
}

function runMagick(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('magick', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `magick exited with code ${code}`));
    });
  });
}

async function compressImage(filePath, { width, height, quality, dryRun }) {
  const extension = path.extname(filePath).toLowerCase();
  const tempFilePath = `${filePath}.tmp${extension}`;
  const args = [
    filePath,
    '-auto-orient',
    '-resize',
    `${width}x${height}^`,
    '-gravity',
    'center',
    '-extent',
    `${width}x${height}`,
    '-strip',
  ];

  if (extension === '.jpg' || extension === '.jpeg' || extension === '.webp') {
    args.push('-quality', String(quality));
  }

  if (extension === '.png') {
    args.push('-define', 'png:compression-level=9');
  }

  args.push(tempFilePath);

  if (dryRun) {
    console.log(`[dry-run] magick ${args.join(' ')}`);
    return;
  }

  await runMagick(args);
  await fs.rename(tempFilePath, filePath);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    showHelp();
    return;
  }

  if (!Number.isFinite(options.width) || options.width <= 0) {
    throw new Error(`Invalid width: ${options.width}`);
  }

  if (!Number.isFinite(options.height) || options.height <= 0) {
    throw new Error(`Invalid height: ${options.height}`);
  }

  if (!Number.isFinite(options.quality) || options.quality < 1 || options.quality > 100) {
    throw new Error(`Invalid quality: ${options.quality}`);
  }

  const coversDir = await resolveCoversDir(options.dir);
  const files = await collectImageFiles(coversDir);

  if (!files.length) {
    console.log(`No cover images found in ${coversDir}`);
    return;
  }

  console.log(
    `${options.dryRun ? 'Previewing' : 'Compressing'} ${files.length} cover images in ${coversDir} to ${options.width}x${options.height} (quality ${options.quality}).`,
  );

  let successCount = 0;
  const failures = [];

  for (const filePath of files) {
    try {
      await compressImage(filePath, options);
      successCount += 1;
      console.log(`${options.dryRun ? 'Would process' : 'Processed'} ${path.basename(filePath)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ filePath, message });
      console.error(`Skipped ${path.basename(filePath)}: ${message}`);
    }
  }

  console.log(
    `${options.dryRun ? 'Previewed' : 'Finished'} ${successCount}/${files.length} cover images successfully.`,
  );

  if (failures.length) {
    console.warn(`Encountered ${failures.length} failed image(s):`);
    for (const failure of failures) {
      console.warn(`- ${path.basename(failure.filePath)}: ${failure.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
