const utils = require('../utils');
const rootDir = utils.rootDir();
const fs = require('fs-extra');

module.exports = {
	src: '',
	fn: async function() {
		await fs.remove(`${rootDir}/packages/app-cli/tests-build`);
		await fs.remove(`${rootDir}/packages/app-cli/build`);
	},
};
