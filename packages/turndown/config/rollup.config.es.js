import config from './rollup.config';

export default config({
	output: {
		file: 'lib/turndown.es.js',
		format: 'es',
	},
	browser: false,
});
