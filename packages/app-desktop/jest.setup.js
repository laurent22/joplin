/* eslint-disable jest/require-top-level-describe */

require('../../jest.base-setup.js')();
const { shimInit } = require('@joplin/lib/shim-init-node');
const sqlite3 = require('sqlite3');
const SyncTargetNone = require('@joplin/lib/SyncTargetNone').default;

// jsdom doesn't provide TextEncoder/TextDecoder, which lib's web crypto code uses
const { TextDecoder, TextEncoder } = require('node:util');
globalThis.TextEncoder ??= TextEncoder;
globalThis.TextDecoder ??= TextDecoder;

// Mock the S3 sync target -- the @aws-s3 libraries depend on an old version
// of uuid that doesn't work with jest without additional configuration.
jest.doMock('@joplin/lib/SyncTargetAmazonS3', () => {
	return SyncTargetNone;
});

// @electron/remote requires electron to be running. Mock it.
jest.mock('@electron/remote', () => {
	return {
		require: () => {
			return {
				default: {},
			};
		},
		getGlobal: () => ({}),
	};
});

// Import after mocking problematic libraries
const { afterEachCleanUp, afterAllCleanUp } = require('@joplin/lib/testing/test-utils.js');
const React = require('react');

const sqliteVec = require('sqlite-vec');

shimInit({ nodeSqlite: sqlite3, React, sqliteVec });

// The default waitFor/findBy timeout of 1s is often too low on CI
require('@testing-library/react').configure({ asyncUtilTimeout: 5_000 });

afterEach(async () => {
	await afterEachCleanUp();
});

afterAll(async () => {
	await afterAllCleanUp();
});

