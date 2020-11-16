#!/bin/bash
set -e
git pull
npm version patch
npm publish
