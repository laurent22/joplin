#!/usr/bin/env bash

# Because all the files in the "lib" directory are included as "lib/file.js" it
# means "lib" must be in NODE_PATH, however modifying the global NODE_PATH
# variable would be messy. So instead, the path is set temporarily just before running
# the app. To do this, this bash wrapper is needed (also a messy solution, but node
# path resolution is messy anyway). See https://gist.github.com/branneman/8048520

# https://stackoverflow.com/questions/59895/getting-the-source-directory-of-a-bash-script-from-within
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  CLIENT_DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$CLIENT_DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
CLIENT_DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

NODE_PATH="$CLIENT_DIR:$NODE_PATH" node "$CLIENT_DIR/main.js" "$@"