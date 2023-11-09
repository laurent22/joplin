import config from './rollup.config.mjs';

export default config({
	output: {
		file: 'lib/turndown.browser.umd.js',
		format: 'umd',
	},
	browser: true,
});
