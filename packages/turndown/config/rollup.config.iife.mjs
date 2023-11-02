import config from './rollup.config.mjs';

export default config({
	output: {
		file: 'dist/turndown.js',
		format: 'iife',
	},
	browser: true,
});
