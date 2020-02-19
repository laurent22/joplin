const utils = require('../utils');

const rootDir = utils.rootDir();

module.exports = {
	src: `${rootDir}/ReactNativeClient/lib/**/*`,
	fn: async function() {
		await utils.copyDir(`${rootDir}/ReactNativeClient/lib`, `${rootDir}/CliClient/build/lib`);
		await utils.copyDir(`${rootDir}/ReactNativeClient/lib`, `${rootDir}/ElectronClient/lib`);
	},
};
