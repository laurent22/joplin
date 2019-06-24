#!/bin/bash
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$ROOT_DIR"
./build.sh || exit 1
cd "$ROOT_DIR/app"

./node_modules/.bin/electron . --env dev --log-level debug --no-welcome --open-dev-tools "$@"

# ./node_modules/.bin/electron . --profile ~/Temp/TestJoplin1 --env dev --log-level debug --open-dev-tools "$@"
# ./node_modules/.bin/electron . --profile ~/Temp/TestJoplin2 --env dev --log-level debug --open-dev-tools "$@"