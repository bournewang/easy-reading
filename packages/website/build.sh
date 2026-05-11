set -e

ENV_FILE=".env.production"
ORIGINAL_SITE_URL=$(grep '^NEXT_PUBLIC_SITE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)

restore_env() {
  sed -i '' "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=${ORIGINAL_SITE_URL}|" "$ENV_FILE"
}
trap restore_env EXIT

# --- Build 1: englishreader.org ---
echo "=== Building for englishreader.org ==="
sed -i '' 's|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://englishreader.org|' "$ENV_FILE"

npm run clean && say "clean complete, building englishreader.org"
npm run build && say "build complete, building sitemap"
sh scripts/build-sitemap.sh && say "sitemap complete for englishreader.org"


DEST_DIST="${HOME}/work/easy-reading-dist/dist"
echo "=== Syncing dist/ to $DEST_DIST ==="
rm -rf $DEST_DIST
echo "cp -r dist $DEST_DIST"
cp -r dist $DEST_DIST
say "copy complete"

# --- Build 2: english-reader.com ---
echo "=== Building for english-reader.com ==="
sed -i '' 's|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=https://english-reader.com|' "$ENV_FILE"

npm run clean && say "clean complete, building english-reader.com"
npm run build && say "build complete, building sitemap"
sh scripts/build-sitemap.sh && say "sitemap complete for english-reader.com"
