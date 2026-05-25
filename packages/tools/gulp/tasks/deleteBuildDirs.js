import utils from '../utils';
import fs from 'fs-extra';
const rootDir = utils.rootDir();

module.exports = {
	src: '',
	fn: async function() {
		await fs.remove(`${rootDir}/packages/app-cli/tests-build`);
		await fs.remove(`${rootDir}/packages/app-cli/build`);
	},
};
