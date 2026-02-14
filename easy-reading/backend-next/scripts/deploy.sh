#!/bin/bash

# Check if environment parameter is provided
if [ -z "$1" ]; then
    echo "Usage: ./deploy.sh [prod|preview]"
    echo "  prod    - Deploy to production"
    echo "  preview - Deploy to preview"
    exit 1
fi

# Configuration
SERVER_USER="root"
SERVER_HOST="47.103.218.95"

# Set deployment path based on environment
if [ "$1" = "prod" ]; then
    SERVER_PATH="/var/www/html/english-reader/backend-next"
    echo "Deploying to production..."
elif [ "$1" = "preview" ]; then
    SERVER_PATH="/var/www/html/english-reader/backend-preview"
    echo "Deploying to preview..."
else
    echo "Invalid environment. Use 'prod' or 'preview'"
    exit 1
fi

# Deploy using rsync
echo "Starting deployment to ${SERVER_HOST}:${SERVER_PATH}"
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='dist' --exclude='.env*' \
  ./ \
  ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}

exit 0

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo "Deployment successful!"
    
    # Restart the service based on environment
    if [ "$1" = "prod" ]; then
        echo "Restarting production service..."
        ssh ${SERVER_USER}@${SERVER_HOST} "cd ${SERVER_PATH} && npm run build && pm2 restart english-reader-backend && echo 'Production service restarted'"
    else
        echo "Restarting preview service..."
        ssh ${SERVER_USER}@${SERVER_HOST} "cd ${SERVER_PATH} && npm run build && pm2 restart backend-preview && echo 'Preview service restarted'"
    fi
else
    echo "Deployment failed!"
    exit 1
fi