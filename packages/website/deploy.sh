#!/bin/sh

# Check if project name is provided
# if [ $# -eq 0 ]; then
#     echo "Usage: $0 <project-name>"
#     echo "Example: $0 wordmate"
#     exit 1
# fi

PROJECT_NAME="english-reader"
BUILD_DIR="dist"

# echo "Building..."
# npm run build

# echo "Copying functions into build..."
# cp -r functions $BUILD_DIR

echo "Zipping build..."
cd $BUILD_DIR
target=${PROJECT_NAME}-`date +%Y%m%d%H%M%S`.zip
zip -r $target *

cd ..
echo "Deploying $target to project: $PROJECT_NAME..."

# Load environment variables from .env.common if it exists
if [ -f ".env" ]; then
    echo "Loading environment variables from .env ..."
    # export $(cat .env.common | grep -v '^#' | xargs)
    export `grep EDGEONE_PAGES_API_TOKEN .env`
fi

# Use token from environment variable if available
if [ -n "$EDGEONE_PAGES_API_TOKEN" ]; then
    echo "Using EdgeOne API token from environment variable..."
    echo "edgeone pages deploy $BUILD_DIR/$target -n $PROJECT_NAME --token $EDGEONE_PAGES_API_TOKEN"
    edgeone pages deploy $BUILD_DIR/$target -n $PROJECT_NAME --token $EDGEONE_PAGES_API_TOKEN
else
    echo "No EDGEONE_PAGES_API_TOKEN found, using default authentication..."
    edgeone pages deploy $BUILD_DIR/$target -n $PROJECT_NAME
fi

echo "Done"
