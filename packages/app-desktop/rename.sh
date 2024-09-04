#!/bin/bash
cd dist

OS=$(uname -s)
ARCH=$(uname -m)

if [[ "$OS" == "Darwin" && "$ARCH" == "arm64" ]]; then
    echo "Renaming file..."
    if [ -f latest-mac.yml ]; then
        mv latest-mac.yml latest-mac-arm64.yml
        echo "latest-mac.yml was succesfully renamed to latest-mac-arm64.yml"
    else
        echo "latest-mac.yml was not found"
    fi
fi
