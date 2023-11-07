import config from './rollup.config.mjs';

export default config({
	output: {
		file: 'lib/turndown.browser.cjs.js',
		format: 'cjs',
	},
	browser: true,
});
