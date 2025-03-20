#!/bin/bash

# Configuration
SERVER_USER="root"
SERVER_HOST="47.103.218.95"
SERVER_PATH="/var/www/html/english-reader/front"  # Your server's web root directory
SOURCE_PATH="out/"  # The local dist directory to deploy

# Build the project
# echo "🏗️  Building project..."
# pnpm build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Aborting deployment."
    exit 1
fi

# Deploy using rsync
echo "🚀 Deploying to server..."
rsync -avz --delete \
    --exclude='.DS_Store' \
    --exclude='*.map' \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.env*' \
    $SOURCE_PATH $SERVER_USER@$SERVER_HOST:$SERVER_PATH

# Check if rsync was successful
if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
else
    echo "❌ Deployment failed!"
    exit 1
fi 