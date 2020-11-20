const { afterEachCleanUp } = require('./tests/test-utils.js');

global.afterEach(async () => {
	await afterEachCleanUp();
});
