const commonjs = require('@rollup/plugin-commonjs');

module.exports = {
	input: 'main-html.js',
	output: {
		file: 'main-html.bundle.js',
		format: 'cjs',
	},
	plugins: [commonjs({
		dynamicRequireTargets: [
			'codemirror/mode/python/python',
		],
	})],
};
