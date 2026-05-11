#!/usr/bin/env bash

ENV_FILE=".env.production"
HOST="${NEXT_PUBLIC_SITE_URL}"

if [ -z "$HOST" ] && [ -f "$ENV_FILE" ]; then
  HOST=$(grep '^NEXT_PUBLIC_SITE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2-)
fi

if [ -z "$HOST" ]; then
  HOST="https://english-reader.com"
fi

DIST_DIR="dist"
OUTPUT="$DIST_DIR/sitemap.xml"

echo '<?xml version="1.0" encoding="UTF-8"?>' > $OUTPUT
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' >> $OUTPUT

# find all index.html files
find "$DIST_DIR" -type f -name "index.html" | while read -r file; do
    echo $file
  # get directory path
  dir=$(dirname "$file")

  # remove leading dist
  url_path=${dir#"$DIST_DIR"}

  # ensure leading slash
  url_path="/${url_path#/}"

  # exclude admin pages from sitemap output
  if [ "$url_path" = "/admin" ] || [[ "$url_path" == /admin/* ]]; then
    continue
  fi

  # special case: root "/"
  if [ "$url_path" = "/" ]; then
    url="$HOST/"
  else
    url="$HOST$url_path"
  fi

  echo "  <url><loc>$url</loc></url>" >> $OUTPUT
done

echo '</urlset>' >> $OUTPUT

echo "✅ sitemap generated at $OUTPUT"
