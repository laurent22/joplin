const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
	entry: './src/index.ts',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: [ '.tsx', '.ts', '.js' ],
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{
					from: "**/*",
					context: path.resolve(__dirname, 'src'),
					to: path.resolve(__dirname, 'dist'),
					globOptions: {
						ignore: [
							'**/*.ts',
							'**/*.tsx',
						],
					},
				},
			],
		}),
	],
	output: {
		filename: 'index.js',
		path: path.resolve(__dirname, 'dist'),
	},
};