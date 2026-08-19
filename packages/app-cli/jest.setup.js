const { afterEachCleanUp } = require('@joplin/lib/testing/test-utils.js');
const { default: shimInitCli } = require('./app/utils/shimInitCli');
const shim = require('@joplin/lib/shim').default;
const sharp = require('sharp');
const nodeSqlite = require('sqlite3');
require('../../jest.base-setup.js')();

let keytar;
try {
	keytar = shim.platformSupportsKeyChain() ? require('keytar') : null;
} catch (error) {
	console.error('Cannot load keytar - keychain support will be disabled', error);
	keytar = null;
}

shimInitCli({ sharp, nodeSqlite, appVersion: () => require('./package.json').version, keytar });

global.afterEach(async () => {
	await afterEachCleanUp();
});
