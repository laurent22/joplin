/* eslint-disable jest/require-top-level-describe */

const { shimInit } = require('@joplin/lib/shim-init-node');
const sqlite3 = require('sqlite3');
const SyncTargetNone = require('@joplin/lib/SyncTargetNone').default;
require('../../jest.base-setup.js')();

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
	};
});

// Import after mocking problematic libraries
const { afterEachCleanUp, afterAllCleanUp } = require('@joplin/lib/testing/test-utils.js');
const React = require('react');

shimInit({ nodeSqlite: sqlite3, React });

afterEach(async () => {
	await afterEachCleanUp();
});

afterAll(async () => {
	await afterAllCleanUp();
});

