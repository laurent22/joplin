import config from './rollup.config.mjs';

export default config({
	output: {
		file: 'lib/turndown.es.js',
		format: 'es',
	},
	browser: false,
});
