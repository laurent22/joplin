require('app-module-path').addPath(__dirname + '/..');
require('source-map-support').install();

import db from '../app/db';

// Wrap an async test in a try/catch block so that done() is always called
// and display a proper error message instead of "unhandled promise error"
export const asyncTest = function(callback:Function) {
	return async function(done:Function) {
		try {
			await callback();
		} catch (error) {
			console.error(error);
		} finally {
			done();
		}
	};
};

export const clearDatabase = function():void {
	db('sessions').truncate();
	db('users').truncate();
};
