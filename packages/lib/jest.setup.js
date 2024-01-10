const { afterEachCleanUp } = require('./testing/test-utils.js');
const { shimInit } = require('./shim-init-node.js');
const sharp = require('sharp');
const nodeSqlite = require('sqlite3');
const pdfJs = require('pdfjs-dist');

// Used for testing some shared components
const React = require('react');

require('../../jest.base-setup.js')();

shimInit({ sharp, nodeSqlite, pdfJs, React });

global.afterEach(async () => {
	await afterEachCleanUp();
});
