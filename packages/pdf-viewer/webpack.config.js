const path = require('path');

module.exports = {
	entry: {
		main: './main.tsx',
		'pdf.worker': 'pdfjs-dist/build/pdf.worker.entry',
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.css$/i,
				use: ['style-loader', 'css-loader'],
			},
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	performance: {
		// Disable warnings - "WARNING in entrypoint size limit: The following
		// entrypoint(s) combined asset size exceeds the recommended limit (244
		// KiB). This can impact web performance."
		hints: false,
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
		clean: true,
	},
};
