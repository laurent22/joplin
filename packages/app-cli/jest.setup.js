import jest_base_setup_11 from '../../jest.base-setup.js';
import keytar_12 from 'keytar';
import { version as version_13 } from './package.json';
import { afterEachCleanUp } from '@joplin/lib/testing/test-utils.js';
import { default as shimInitCli } from './app/utils/shimInitCli';
import shim from '@joplin/lib/shim';
import sharp from 'sharp';
import nodeSqlite from 'sqlite3';
jest_base_setup_11();

let keytar;
try {
	keytar = shim.platformSupportsKeyChain() ? keytar_12 : null;
} catch (error) {
	console.error('Cannot load keytar - keychain support will be disabled', error);
	keytar = null;
}

shimInitCli({ sharp, nodeSqlite, appVersion: () => version_13, keytar });

global.afterEach(async () => {
	await afterEachCleanUp();
});
