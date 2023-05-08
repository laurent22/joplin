const commonjs = require('@rollup/plugin-commonjs');
const nodeResolve = require('@rollup/plugin-node-resolve');
const pluginJson = require('@rollup/plugin-json');

module.exports = {
	input: 'main-html.js',
	output: {
		file: 'main-html.bundle.js',
		format: 'cjs',
	},
	plugins: [
		nodeResolve(),
		pluginJson(),
		commonjs({
			dynamicRequireTargets: [
				'codemirror/mode/python/python',
			],
		}),
	],
	external: [
		'keytar',
		'fsevents',
	],
};
