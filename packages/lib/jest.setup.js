const { afterEachCleanUp } = require('./testing/test-utils.js');
const { shimInit } = require('./shim-init-node.js');
const sharp = require('sharp');
const nodeSqlite = require('sqlite3');
const pdfJs = require('pdfjs-dist');
const packageInfo = require('./package.json');

// sqlite-vec and onnxruntime-node are only bundled with the desktop app in
// production. We pull them in here so tests covering the embeddings index +
// local model have working modules to load. Wrapped in try/catch so platforms
// without a prebuilt (e.g. macOS x64, where onnxruntime-node ships no binary)
// don't crash the whole suite — they just skip the relevant tests.
// Silent on failure: Jest re-runs this file per test, so warning here floods
// CI logs with duplicates. Any test that actually needs these modules already
// has its own skip-if-unavailable logic.
// Only suppress MODULE_NOT_FOUND (the expected "no prebuilt for this platform"
// case). Anything else — ABI mismatches, corrupt installs — should surface.
let sqliteVec = null;
try {
	sqliteVec = require('sqlite-vec');
} catch (error) {
	if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

let onnxRuntime = null;
try {
	onnxRuntime = require('onnxruntime-node');
} catch (error) {
	if (error.code !== 'MODULE_NOT_FOUND') throw error;
}

// Used for testing some shared components
const React = require('react');

require('../../jest.base-setup.js')();

shimInit({ pdfJs, sharp, nodeSqlite, sqliteVec, onnxRuntime, React, appVersion: () => packageInfo.version });

global.afterEach(async () => {
	await afterEachCleanUp();
});
