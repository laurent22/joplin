#!/bin/bash
set -e
npm run build && NODE_PATH="build/" node build/cli-integration-tests.js