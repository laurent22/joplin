#!/bin/bash

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="$ROOT_DIR/build"

rsync -a --exclude "node_modules/" "$ROOT_DIR/app/" "$BUILD_DIR/"
rsync -a "$ROOT_DIR/../ReactNativeClient/lib/" "$BUILD_DIR/lib/"
cp "$ROOT_DIR/package.json" "$BUILD_DIR"
chmod 755 "$BUILD_DIR/main.js"

cd "$BUILD_DIR"
node build-translation.js --silent









# ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# # require('cache-require-paths');

# mkdir -p "$ROOT_DIR/build"
# rm -f "$ROOT_DIR/app/lib"
# ln -s "$ROOT_DIR/../ReactNativeClient/lib" "$ROOT_DIR/app"

# npm run build || exit 1

# # Files under app/gui are in ES6 already but I cannot get Babel
# # to ignore them, so copy them back to the build directory.
# rsync -a "$ROOT_DIR/app/gui/" "$ROOT_DIR/build/gui/"

# cp "$ROOT_DIR/package.json" "$ROOT_DIR/build"

# chmod 755 "$ROOT_DIR/build/main.js"

# # if [[ ! -f "$ROOT_DIR/package.json.md5" ]]; then
# # 	"$ROOT_DIR/update-package-md5.sh"
# # fi

# # Add modules on top of main.js:
# # - cache-require-paths to cache require() calls
# # - app-module-path so that lib/something paths can be resolved.

# #PACKAGE_MD5=$(cat "$ROOT_DIR/package.json.md5")
# MAIN_PATH="$ROOT_DIR/build/main.js"
# #LINE_TO_ADD="var osTmpdir = require('os-tmpdir'); process.env.CACHE_REQUIRE_PATHS_FILE = osTmpdir() + '/joplin-module-path-cache-$PACKAGE_MD5'; require('cache-require-paths'); require('app-module-path').addPath(__dirname);"
# LINE_TO_ADD="require('app-module-path').addPath(__dirname);"
# RESULT="$(grep "$LINE_TO_ADD" "$MAIN_PATH")"
# if [[ -z "$RESULT" ]]; then
# 	echo "Adding extra modules..."
# 	sed -i "2i $LINE_TO_ADD" "$MAIN_PATH"
# else
# 	echo "Extra modules already added."
# fi

# NODE_PATH="$ROOT_DIR/build" node "$ROOT_DIR/build/build-translation.js" --silent