const path = require('path');
const webpack = require('webpack');

module.exports = {
	entry: './dist/utils/e2ee/index.js',
	devtool: 'source-map',
	mode: 'production',
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

		// Exclude locales because it's a lot of files and they aren't used
		'./locales/index.js': 'commonjs locales',

		// Remove the largest highlight.js languages
		'./languages/mathematica': 'commonjs mathematica',
		'./languages/isbl': 'commonjs isbl',
		'./languages/1c': 'commonjs 1c',
		'./languages/gml': 'commonjs gml',
		'./languages/sqf': 'commonjs sqf',
		'./languages/maxima': 'commonjs maxima',
		'./languages/pgsql': 'commonjs pgsql',
		'./languages/stata': 'commonjs stata',
		'./languages/less': 'commonjs less',
		'./languages/lsl': 'commonjs lsl',
	},
	plugins: [
		// https://github.com/moment/moment/issues/2416
		new webpack.IgnorePlugin({ resourceRegExp: /^\.\/locale$/, contextRegExp: /moment$/ }),
	],
};
