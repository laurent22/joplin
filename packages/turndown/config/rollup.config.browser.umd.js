import config from './rollup.config';

export default config({
	output: {
		file: 'lib/turndown.browser.umd.js',
		format: 'umd',
	},
	browser: true,
});
