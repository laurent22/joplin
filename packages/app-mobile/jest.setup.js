/* eslint-disable jest/require-top-level-describe */

const { afterEachCleanUp, afterAllCleanUp } = require('@joplin/lib/testing/test-utils.js');
const { shimInit } = require('@joplin/lib/shim-init-node.js');
const { mkdir, rm } = require('fs-extra');
const path = require('path');
const { tmpdir } = require('os');
const uuid = require('@joplin/lib/uuid').default;
const sqlite3 = require('sqlite3');

import { setImmediate } from 'timers';

// Required by some libraries (setImmediate is not supported in most browsers,
// so is removed by jsdom).
window.setImmediate = setImmediate;

// Prevents the CodeMirror error "getClientRects is undefined".
// See https://github.com/jsdom/jsdom/issues/3002#issue-652790925
document.createRange = () => {
	const range = new Range();
	range.getBoundingClientRect = jest.fn();
	range.getClientRects = () => {
		return {
			length: 0,
			item: () => null,
			[Symbol.iterator]: jest.fn(),
		};
	};

	return range;
};


shimInit({ nodeSqlite: sqlite3 });


// react-native-fs's CachesDirectoryPath export doesn't work in a testing environment.
// Use a temporary folder instead.
const tempDirectoryPath = path.join(tmpdir(), `appmobile-test-${uuid.createNano()}`);

jest.doMock('react-native-fs', () => {
	return {
		CachesDirectoryPath: tempDirectoryPath,
	};
});

beforeAll(async () => {
	await mkdir(tempDirectoryPath);
});

afterEach(async () => {
	await afterEachCleanUp();
});

afterAll(async () => {
	await afterAllCleanUp();
	await rm(tempDirectoryPath, { recursive: true });
});
