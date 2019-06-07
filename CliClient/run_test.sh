#!/bin/bash
START_DIR="$(pwd)"
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="$ROOT_DIR/tests-build"
TEST_FILE="$1"

rsync -a --exclude "node_modules/" "$ROOT_DIR/tests/" "$BUILD_DIR/"
rsync -a "$ROOT_DIR/../ReactNativeClient/lib/" "$BUILD_DIR/lib/"
rsync -a "$ROOT_DIR/build/locales/" "$BUILD_DIR/locales/"
mkdir -p "$BUILD_DIR/data"

if [[ $TEST_FILE != "" ]]; then
	(cd "$ROOT_DIR" && npm test tests-build/$TEST_FILE.js)
	exit
fi

function finish {
	cd "$START_DIR"
}

trap finish EXIT

cd "$ROOT_DIR"
npm test tests-build/ArrayUtils.js
npm test tests-build/encryption.js
npm test tests-build/EnexToMd.js
npm test tests-build/HtmlToMd.js
npm test tests-build/markdownUtils.js
npm test tests-build/models_BaseItem.js
npm test tests-build/models_Folder.js
npm test tests-build/models_ItemChange.js
npm test tests-build/models_Note.js
npm test tests-build/models_Resource.js
npm test tests-build/models_Revision.js
npm test tests-build/models_Setting.js
npm test tests-build/models_Tag.js
npm test tests-build/pathUtils.js
npm test tests-build/services_InteropService.js
npm test tests-build/services_KvStore.js
npm test tests-build/services_ResourceService.js
npm test tests-build/services_rest_Api.js
npm test tests-build/services_SearchEngine.js
npm test tests-build/services_Revision.js
npm test tests-build/StringUtils.js
npm test tests-build/synchronizer.js
npm test tests-build/urlUtils.js