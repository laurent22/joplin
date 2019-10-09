#!/bin/bash
START_DIR="$(pwd)"
ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="$ROOT_DIR/tests-build"
TEST_FILE="$1"

rsync -a --exclude "node_modules/" "$ROOT_DIR/tests/" "$BUILD_DIR/"
rsync -a "$ROOT_DIR/../ReactNativeClient/lib/" "$BUILD_DIR/lib/"
rsync -a "$ROOT_DIR/../ReactNativeClient/locales/" "$BUILD_DIR/locales/"
mkdir -p "$BUILD_DIR/data"

if [[ $TEST_FILE != "" ]]; then
	(cd "$ROOT_DIR" && NODE_ENV=testing npm test tests-build/$TEST_FILE.js)
	exit
fi

function finish {
	cd "$START_DIR"
}

trap finish EXIT

cd "$ROOT_DIR"
NODE_ENV=testing npm test tests-build/ArrayUtils.js && \
NODE_ENV=testing npm test tests-build/encryption.js && \
NODE_ENV=testing npm test tests-build/EnexToMd.js && \
NODE_ENV=testing npm test tests-build/EnexToHtml.js && \
NODE_ENV=testing npm test tests-build/HtmlToMd.js && \
NODE_ENV=testing npm test tests-build/markdownUtils.js && \
NODE_ENV=testing npm test tests-build/models_BaseItem.js && \
NODE_ENV=testing npm test tests-build/models_Folder.js && \
NODE_ENV=testing npm test tests-build/models_ItemChange.js && \
NODE_ENV=testing npm test tests-build/models_Note.js && \
NODE_ENV=testing npm test tests-build/models_Resource.js && \
NODE_ENV=testing npm test tests-build/models_Revision.js && \
NODE_ENV=testing npm test tests-build/models_Setting.js && \
NODE_ENV=testing npm test tests-build/models_Tag.js && \
NODE_ENV=testing npm test tests-build/pathUtils.js && \
NODE_ENV=testing npm test tests-build/services_InteropService.js && \
NODE_ENV=testing npm test tests-build/services_KvStore.js && \
NODE_ENV=testing npm test tests-build/services_ResourceService.js && \
NODE_ENV=testing npm test tests-build/services_rest_Api.js && \
NODE_ENV=testing npm test tests-build/services_SearchEngine.js && \
NODE_ENV=testing npm test tests-build/services_Revision.js && \
NODE_ENV=testing npm test tests-build/StringUtils.js && \
NODE_ENV=testing npm test tests-build/TaskQueue.js && \
NODE_ENV=testing npm test tests-build/synchronizer.js && \
NODE_ENV=testing npm test tests-build/urlUtils.js
