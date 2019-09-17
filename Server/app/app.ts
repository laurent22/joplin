require('app-module-path').addPath(__dirname + '/..');
require('source-map-support').install();

import { Request, Response, NextFunction } from 'express';

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mustacheExpress = require('mustache-express');

const indexRouter = require('./routes/index');
const sessionsRouter = require('./routes/sessions');

const app = express();

const viewDir = './views';

app.engine('mustache', mustacheExpress(viewDir + '/partials'));

// view engine setup
app.set('views', viewDir);
app.set('view engine', 'mustache');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/sessions', sessionsRouter);

// catch 404 and forward to error handler
app.use(function(req:Request, res:Response, next:NextFunction) {
	next(createError(404));
});

// error handler
app.use(function(err:any, req:Request, res:Response) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;
