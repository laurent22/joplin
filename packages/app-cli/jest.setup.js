const { afterEachCleanUp } = require('@joplin/lib/testing/test-utils.js');

global.afterEach(async () => {
	await afterEachCleanUp();
});
