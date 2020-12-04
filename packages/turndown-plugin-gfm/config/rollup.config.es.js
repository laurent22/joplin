import config from './rollup.config';

export default config({
	output: {
		format: 'es',
		file: 'lib/turndown-plugin-gfm.es.js',
	},
});
