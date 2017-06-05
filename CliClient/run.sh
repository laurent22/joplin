#!/bin/bash
npm run build && NODE_PATH=/var/www/joplin/CliClient/build/ node build/import-enex.js