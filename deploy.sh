#!/bin/bash

# Since I'm using NVM
PATH=~/.nvm/versions/node/v14.15.1/bin:$PATH
cd /var/www/ihaapi-ts

git pull

npm install
npm run build

# Supress output
echo "Restarting PM2 ihaAPI process"
pm2 restart ihaAPI &> /dev/null
echo "Process ihaAPI is restarted!"
