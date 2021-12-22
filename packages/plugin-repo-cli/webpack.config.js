const path = require('path');
const webpack = require('webpack');

const distDir = path.resolve(__dirname, 'dist');

// To get source maps working:
//
// - Need to add `require('source-map-support').install()` on top of index.ts
// - Set `devtool: 'source-map'`
// - It only works in development mode
// - Need to add the "source-map-loader" rule so that it uses the maps generated
//   by TypeScript

module.exports = {
	entry: './index.js',
	mode: 'development',
	target: 'node',
	devtool: 'source-map',
	output: {
		filename: 'index.js',
		path: distDir,
	},
	plugins: [
		new webpack.BannerPlugin({
			banner: '#!/usr/bin/env node\n',
			raw: true,
		}),
	],
	module: {
		rules: [
			{
				test: /\.js$/,
				enforce: 'pre',
				use: ['source-map-loader'],
			},
		],
	},
};
