const { afterEachCleanUp } = require('./testing/test-utils.js');
const { shimInit } = require('./shim-init-node.js');
const sharp = require('sharp');
const nodeSqlite = require('sqlite3');
const pdfJs = require('pdfjs-dist');

require('../../jest.base-setup.js')();

shimInit({ sharp, nodeSqlite, pdfJs });

global.afterEach(async () => {
	await afterEachCleanUp();
});
