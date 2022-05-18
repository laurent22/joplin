const path = require('path');

module.exports = {
	entry: './dist/utils/e2ee/index.js',
	devtool: 'source-map',
	output: {
		path: path.resolve(__dirname, 'public', 'js'),
		filename: 'bundle_e2ee.js',
	},
	resolve: {
		fallback: {
			'events': require.resolve('events/'),
			'url': require.resolve('url/'),
		},
	},
	externals: {
		// SJCL is designed to work both in Node and the browser, thus it has
		// conditional likes "if crypto is undefined, require('crypto')". That
		// works fine in the browser, but WebPack see the "require()" statement
		// and then ask to include polyfills, but we don't need this (since
		// crypto, etc. are available in the browser). As a result we define
		// them as "external" here.
		'crypto': 'commonjs crypto',
		'stream': 'commonjs stream',
	},
};
