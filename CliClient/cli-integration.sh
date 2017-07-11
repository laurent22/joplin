#!/bin/bash
set -e
./build.sh && NODE_PATH="build/" node build/cli-integration-tests.js