import config from './rollup.config';

export default config({
	output: {
		format: 'cjs',
		file: 'lib/turndown-plugin-gfm.browser.cjs.js',
	},
});
