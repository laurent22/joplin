import config from './rollup.config.mjs';

export default config({
	output: {
		file: 'lib/turndown.umd.js',
		format: 'umd',
	},
});
