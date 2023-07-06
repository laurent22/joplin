/* eslint-disable jest/require-top-level-describe */

const { afterEachCleanUp } = require('@joplin/lib/testing/test-utils.js');
const { shimInit } = require('@joplin/lib/shim-init-node.js');
const sqlite3 = require('sqlite3');

shimInit({ nodeSqlite: sqlite3 });

afterEach(async () => {
	await afterEachCleanUp();
});
