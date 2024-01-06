const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	entry: './src/index.js',
	output: {
		filename: 'index.js',
		path: path.resolve(__dirname, 'build'),
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: './public/index.html',
		}),
	],
	module: {
		rules: [
			{
				test: /\.(?:js|mjs|cjs)$/i,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
				},
			},
			{
				test: /\.css$/i,
				use: ['style-loader', 'css-loader'],
			},
			{
				test: /.png$/i,
				type: 'asset/inline',
			},
		],
	},
};
