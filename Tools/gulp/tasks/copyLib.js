const utils = require('../utils');

const rootDir = utils.rootDir();

module.exports = {
	src: `${rootDir}/ReactNativeClient/lib/**/*`,
	fn: async function() {
		const copyOptions = {
			excluded: [
				`${rootDir}/ReactNativeClient/lib/joplin-renderer/node_modules`,
			],
		};

		await utils.copyDir(`${rootDir}/ReactNativeClient/lib`, `${rootDir}/CliClient/build/lib`, copyOptions);
		await utils.copyDir(`${rootDir}/ReactNativeClient/lib`, `${rootDir}/ElectronClient/lib`, copyOptions);
	},
};
