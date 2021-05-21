const { afterEachCleanUp } = require('./testing/test-utils.js');
const { shimInit } = require('./shim-init-node.js');
const sharp = require('sharp');

shimInit(sharp, null);

global.afterEach(async () => {
	await afterEachCleanUp();
});
