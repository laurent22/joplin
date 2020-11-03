const execa = require('execa');

const rootDir = `${__dirname}/../../../`;
process.chdir(rootDir);

module.exports = {
	src: [
		'packages/app-mobile/**/*.tsx',
		'packages/app-mobile/**/*.ts',
		'packages/app-desktop/**/*.tsx',
		'packages/app-desktop/**/*.ts',
		'packages/app-cli/**/*.tsx',
		'packages/app-cli/**/*.ts',
	],
	fn: async function() {
		const promise = execa('node', ['node_modules/typescript/bin/tsc', '--project', 'tsconfig.json'], { cwd: rootDir });
		promise.stdout.pipe(process.stdout);
		return promise;
	},
};
