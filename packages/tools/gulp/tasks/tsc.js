const execa = require('execa');

const rootDir = `${__dirname}/../../../`;
process.chdir(rootDir);

module.exports = {
	src: [
		'ReactNativeClient/**/*.tsx',
		'ReactNativeClient/**/*.ts',
		'ElectronClient/**/*.tsx',
		'ElectronClient/**/*.ts',
		'CliClient/**/*.tsx',
		'CliClient/**/*.ts',
	],
	fn: async function() {
		const promise = execa('node', ['node_modules/typescript/bin/tsc', '--project', 'tsconfig.json'], { cwd: rootDir });
		promise.stdout.pipe(process.stdout);
		return promise;
	},
};
