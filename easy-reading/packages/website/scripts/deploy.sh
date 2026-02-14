#!/bin/bash

# Configuration
SERVER_USER="root"
SERVER_HOST="47.103.218.95"
PROD_PATH="/var/www/html/english-reader/front"
PREVIEW_PATH="/var/www/html/english-reader/front-preview"
SOURCE_PATH="dist/"

# Function to show usage
show_usage() {
    echo "Usage: $0 [preview|prod]"
    echo "  preview - Deploy to preview environment"
    echo "  prod    - Deploy to production environment"
    echo "  No argument - Deploy to production environment"
    exit 1
}

# Determine deployment path based on argument
if [ "$1" = "preview" ]; then
    SERVER_PATH=$PREVIEW_PATH
    echo "🚀 Deploying to preview environment..."
elif [ "$1" = "prod" ] || [ -z "$1" ]; then
    SERVER_PATH=$PROD_PATH
    echo "🚀 Deploying to production environment..."
else
    show_usage
fi

# Build the project
# echo "🏗️  Building project..."
# pnpm build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Aborting deployment."
    exit 1
fi

# Deploy using rsync
echo "📦 Syncing files to server..."
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