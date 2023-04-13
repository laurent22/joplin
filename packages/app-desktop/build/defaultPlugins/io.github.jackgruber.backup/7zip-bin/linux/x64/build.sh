#!/usr/bin/env bash
set -e

BASEDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

rm -rf /tmp/7z-linux
mkdir /tmp/7z-linux
cp "$BASEDIR/do-build.sh" /tmp/7z-linux/do-build.sh
docker run --rm -v /tmp/7z-linux:/project buildpack-deps:xenial /project/do-build.sh