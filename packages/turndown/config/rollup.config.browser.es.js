import config from './rollup.config';

export default config({
	output: {
		file: 'lib/turndown.browser.es.js',
		format: 'es',
	},
	browser: true,
});
