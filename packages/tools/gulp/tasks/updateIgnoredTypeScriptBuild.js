const utils = require('../utils');
const glob = require('glob');
const rootDir = utils.rootDir();

console.info(rootDir);

module.exports = {
	src: '',
	fn: async function() {
		const tsFiles = glob.sync('{**/*.ts,**/*.tsx}', {
			cwd: rootDir,
			ignore: [
				'**/.git/**',
				'**/node_modules/**',
				'Assets/**/*',
				'packages/api-cli/tests/support/plugins/**/*',
				'packages/api-desktop/dist/**/*',
				'packages/app-cli/build/**/*',
				'packages/app-cli/tests-build/**/*',
				'packages/app-desktop/dist/**/*',
				'packages/app-mobile/android/**/*',
				'packages/app-mobile/ios/**/*',
				'packages/lib/plugin_types/**/*',
			],
		}).filter(f => !f.endsWith('.d.ts'));

		const ignoredJsFiles = tsFiles.map(f => {
			const s = f.split('.');
			s.pop();
			return `${s.join('.')}.js`;
		});

		const ignoredMapFiles = tsFiles.map(f => {
			const s = f.split('.');
			s.pop();
			return `${s.join('.')}.js.map`;
		});

		const ignoredDefFiles = tsFiles.map(f => {
			const s = f.split('.');
			s.pop();
			return `${s.join('.')}.d.ts`;
		});

		const ignoredFiles = ignoredJsFiles.concat(ignoredMapFiles).concat(ignoredDefFiles);
		ignoredFiles.sort();

		const regex = /(# AUTO-GENERATED - EXCLUDED TYPESCRIPT BUILD)[\s\S]*(# AUTO-GENERATED - EXCLUDED TYPESCRIPT BUILD)/;
		const replacement = `$1\n${ignoredFiles.join('\n')}\n$2`;

		await Promise.all([
			utils.replaceFileText(`${rootDir}/.gitignore`, regex, replacement),
			utils.replaceFileText(`${rootDir}/.eslintignore`, regex, replacement),
			// utils.replaceFileText(`${rootDir}/.ignore`, regex, replacement),
		]);
	},
};
