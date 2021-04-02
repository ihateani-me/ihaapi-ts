#!/bin/bash

# Since I'm using NVM
PATH=~/.nvm/versions/node/v14.15.1/bin:$PATH
cd /var/www/ihaapi-ts

# Pull new stuff
echo "Polling new commit"
git pull

# Use pnpm
echo "Installing dependencies..."
pnpm install

# Destroy hopes and dreams
echo "Restarting PM2 Process..."
pm2 restart --silent ihaAPI
