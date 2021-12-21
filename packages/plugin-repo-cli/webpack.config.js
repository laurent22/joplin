const path = require('path');
const webpack = require('webpack');

const distDir = path.resolve(__dirname, 'dist');

module.exports = {
	entry: './index.js',
	mode: 'production',
	target: 'node',
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
};
