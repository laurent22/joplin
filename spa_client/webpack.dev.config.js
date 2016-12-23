// NOT USED

var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: [
    './src/js/app'
  ],
  target: 'web',
  devtool: 'eval-source-map',
  output: {
    path: __dirname + '/src/js/',
    filename: 'app.min.js',
    publicPath: '/js/'
  },
  module: {
    loaders: [{
      test: /\.js$/,
      loaders: ['babel'],
      include: path.join(__dirname, './src/js/')
    }]
  },
  plugins: [
    new webpack.ProvidePlugin({
      'Promise': 'es6-promise'
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"development"'
    })
  ]
};
