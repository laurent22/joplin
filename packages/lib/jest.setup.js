const { afterEachCleanUp } = require('./testing/test-utils.js');
const { shimInit } = require('./shim-init-node.js');
const sharp = require('sharp');
const NodeRSA = require('node-rsa');
const nodeSqlite = require('sqlite3');

shimInit({ sharp, RSA: NodeRSA, nodeSqlite });

global.afterEach(async () => {
	await afterEachCleanUp();
});
