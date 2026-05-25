/* eslint-disable jest/require-top-level-describe */

import jest_base_setup_42 from '../../jest.base-setup.js';
import { shimInit } from '@joplin/lib/shim-init-node';
import sqlite3 from 'sqlite3';
import SyncTargetNone from '@joplin/lib/SyncTargetNone';
import { afterEachCleanUp, afterAllCleanUp } from '@joplin/lib/testing/test-utils.js';
import React from 'react';
jest_base_setup_42();

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

shimInit({ nodeSqlite: sqlite3, React });

afterEach(async () => {
	await afterEachCleanUp();
});

afterAll(async () => {
	await afterAllCleanUp();
});

