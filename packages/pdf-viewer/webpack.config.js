const path = require('path');

module.exports = {
	entry: './index.tsx',
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
		extensions: ['.tsx', '.ts', '.js'],
	},
	output: {
		filename: 'pdfViewer.js',
		path: path.resolve(__dirname, 'dist'),
	},
};
