var path = require('path');
var webpack = require('webpack');

module.exports = {
	quiet: true,
	entry: [
		'./src/js/app.jsx'
	],
	output: {
		path: __dirname + '/dist/js/',
		filename: 'app.js',
		publicPath: '/js/'
	},
	module: {
		loaders: [{
			test: /\.(jsx|js)$/,
			loaders: ['babel'],
			include: path.join(__dirname, './src/js/')
		}]
	},
	resolve: {
		alias: {
			components: path.resolve(__dirname, './src/js/components'),
			models: path.resolve(__dirname, './src/js/models'),
		},
	},
	plugins: [
		// new webpack.optimize.UglifyJsPlugin({
		//   minimize: true,
		//    compress: {
		//       warnings: false
		//   }
		// }),
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': '"development"'
		})
	]
};
