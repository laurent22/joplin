#!/bin/bash
set -e
yarn build && NODE_PATH=build node build/build-doc.js