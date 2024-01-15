const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => ({
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
	// Avoid the default 'eval-source-map' -- Chrome seems to prevent usage of eval
	// in popups.
	devtool: argv.mode === 'development' ? 'cheap-source-map' : undefined,
	module: {
		rules: [
			{
				test: /\.(?:js|mjs|cjs)$/i,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							['@babel/preset-react'],
						],
					},
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
});
