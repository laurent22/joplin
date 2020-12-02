import config from './rollup.config';

export default config({
	output: {
		format: 'iife',
		file: 'dist/turndown-plugin-gfm.js',
	},
});
