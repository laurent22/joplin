#!/bin/bash
#
set -e
yarn run build && NODE_PATH="build/" node build/fuzzing.js