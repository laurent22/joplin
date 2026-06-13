const { afterEachCleanUp } = require('./testing/test-utils.js');
const { shimInit } = require('./shim-init-node.js');
const sharp = require('sharp');
const nodeSqlite = require('sqlite3');
const pdfJs = require('pdfjs-dist');
const packageInfo = require('./package.json');

// sqlite-vec is only bundled with the desktop app in production. We pull it in
// here so tests covering the embeddings index have a working extension to load.
// Wrapped in try/catch so platforms without a prebuilt (e.g. Linux ARM CI runners)
// don't crash the whole suite — they just skip the vector-specific tests.
let sqliteVec = null;
try {
	sqliteVec = require('sqlite-vec');
} catch (error) {
	console.warn('sqlite-vec unavailable in tests on this platform:', error.message);
}

// onnxruntime-node powers the local embedding model. Same loading story as
// sqlite-vec: bundled with desktop only, optional everywhere else, wrapped
// in try/catch so CI runners without a prebuilt skip the tests cleanly.
let onnxRuntime = null;
try {
	onnxRuntime = require('onnxruntime-node');
} catch (error) {
	console.warn('onnxruntime-node unavailable in tests on this platform:', error.message);
}

// Used for testing some shared components
const React = require('react');

require('../../jest.base-setup.js')();

shimInit({ pdfJs, sharp, nodeSqlite, sqliteVec, onnxRuntime, React, appVersion: () => packageInfo.version });

global.afterEach(async () => {
	await afterEachCleanUp();
});
