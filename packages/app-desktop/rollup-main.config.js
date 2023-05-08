const commonjs = require('@rollup/plugin-commonjs');
const nodeResolve = require('@rollup/plugin-node-resolve');
const pluginJson = require('@rollup/plugin-json');

module.exports = {
	input: 'main.source.js',
	output: {
		file: 'main.js',
		format: 'cjs',
	},
	plugins: [
		nodeResolve(),
		pluginJson(),
		commonjs(),
	],
};
