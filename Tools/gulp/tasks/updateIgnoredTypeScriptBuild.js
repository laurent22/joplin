const utils = require('../utils');
const glob = require('glob');
const rootDir = utils.rootDir();

module.exports = {
	src: '',
	fn: async function() {
		const tsFiles = glob.sync(`${rootDir}{/**/*.ts,/**/*.tsx}`, {
			ignore: [
				'**/node_modules/**',
				'**/.git/**',
				'**/ElectronClient/lib/**',
				'**/CliClient/build/lib/**',
				'**/CliClient/tests-build/lib/**',
				'**/ElectronClient/dist/**',
				'**/Modules/TinyMCE/JoplinLists/**',
				'**/Modules/TinyMCE/IconPack/**',
			],
		}).map(f => f.substr(rootDir.length + 1));

		const ignoredFiles = tsFiles.map(f => {
			const s = f.split('.');
			s.pop();
			return `${s.join('.')}.js`;
		});

		const regex = /(# AUTO-GENERATED - EXCLUDED TYPESCRIPT BUILD)[\s\S]*(# AUTO-GENERATED - EXCLUDED TYPESCRIPT BUILD)/;
		const replacement = `$1\n${ignoredFiles.join('\n')}\n$2`;

		await Promise.all([
			utils.replaceFileText(`${rootDir}/.gitignore`, regex, replacement),
			utils.replaceFileText(`${rootDir}/.eslintignore`, regex, replacement),
		]);
	},
};
