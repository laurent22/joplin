import { afterEachCleanUp } from '@joplin/lib/testing/test-utils.js';
import { default as shimInitCli } from './app/utils/shimInitCli';
import shim from '@joplin/lib/shim';
import sharp from 'sharp';
import nodeSqlite from 'sqlite3';
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
