
// Used for testing some shared components

import jest_base_setup_190 from '../../jest.base-setup.js';
import { afterEachCleanUp } from './testing/test-utils.js';
import { shimInit } from './shim-init-node.js';
import sharp from 'sharp';
import nodeSqlite from 'sqlite3';
import pdfJs from 'pdfjs-dist';
import packageInfo from './package.json';
import React from 'react';
jest_base_setup_190();

shimInit({ pdfJs, sharp, nodeSqlite, React, appVersion: () => packageInfo.version });

global.afterEach(async () => {
	await afterEachCleanUp();
});
