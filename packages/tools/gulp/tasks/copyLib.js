const utils = require('../utils');

const rootDir = utils.rootDir();

module.exports = {
	src: `${rootDir}/packages/app-mobile/lib/**/*`,
	fn: async function() {
		const copyOptions = {
			excluded: [
				`${rootDir}/packages/renderer/node_modules`,
			],
		};

		await utils.copyDir(`${rootDir}/packages/app-mobile/lib`, `${rootDir}/packages/app-cli/build/lib`, copyOptions);
		await utils.copyDir(`${rootDir}/packages/app-mobile/lib`, `${rootDir}/packages/app-desktop/lib`, copyOptions);
	},
};
