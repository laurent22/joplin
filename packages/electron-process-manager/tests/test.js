const Application = require('spectron').Application;
const { join } = require('path');
const assert = require('assert');

const app = new Application({
	env: { TEST_PROCESS_MANAGER: 1 },
	path: require(join(__dirname, '../node_modules/electron')),
	args: [join(__dirname, '../example/main.js')],
});

(async () => {
	try {
		await app.start();
		await app.client.waitUntilWindowLoaded();
		await app.electron.ipcRenderer.send('open-process-manager');
		// This looks to be incorrect signature for assert.
		// assert(app.client.getWindowCount(), 2);
		// There are 2 webviews on the index page. They are included in windowCount, so it's 4, not 2.
		assert.equal(await app.client.getWindowCount(), 4);
		await app.client.switchWindow(/process-manager\.html/);
		await (await app.client.$('#app .process-table')).waitForDisplayed({ timeout: 60000 });
		await app.stop();
	} catch (error) {
		console.error('Test failed', error);
		if (app && app.isRunning()) {
			await app.stop();
			process.exit(1);
		} else { process.exit(1); }
	}
})();
