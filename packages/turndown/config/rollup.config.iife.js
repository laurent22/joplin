import config from './rollup.config';

export default config({
	output: {
		file: 'dist/turndown.js',
		format: 'iife',
	},
	browser: true,
});
