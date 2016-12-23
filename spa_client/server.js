var open = require('open');
var path = require('path');
var morgan = require('morgan');
var express = require('express');
var webpack = require('webpack');
var webpackDevMiddleware = require('webpack-dev-middleware');

var config = require('./webpack.config');
var compiler = webpack(config);

var app = express();

app.use(morgan('dev'));

app.use(webpackDevMiddleware(compiler, {
  noInfo: true,
  publicPath: config.output.publicPath
}));

app.use(express.static('./dist/'));

app.get('*', function (req, res){
  res.sendFile(path.resolve(__dirname, './dist/', 'index.html'))
});

app.listen(3000, function (err) {
  if (err) {
    return console.error(err);
  }

  console.log('Web listening at http://localhost:3000/.');
});
