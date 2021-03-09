#!/bin/bash

# Since I'm using NVM
PATH=~/.nvm/versions/node/v14.15.1/bin:$PATH
cd /var/www/ihaapi-ts

git pull

# Use custom build script because fuck you npm, you slow ass fuck
python3 tools/buildTools.py
