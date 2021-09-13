const { afterEachCleanUp } = require('./testing/test-utils.js');
const { shimInit } = require('./shim-init-node.js');
const sharp = require('sharp');
const NodeRSA = require('node-rsa');

shimInit(sharp, null, null, NodeRSA);

global.afterEach(async () => {
	await afterEachCleanUp();
});
