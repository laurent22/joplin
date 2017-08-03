#!/usr/bin/env node

// Because all the files in the "lib" directory are included as "lib/file.js" it
// means "lib" must be in NODE_PATH, however modifying the global NODE_PATH
// variable would be messy. So instead, the path is set temporarily just before running
// the app. To do this, this wrapper is needed.
// See https://gist.github.com/branneman/8048520
// Original wrapper code from https://gist.github.com/branneman/8775568

'use strict';

var spawn = require('child_process').spawn;

var args = ['main.js'];

if (process.argv[1].indexOf('joplindev') >= 0) {
	args.push('--profile');
	args.push('/mnt/d/Temp/TestNotes2');
	args.push('--stack-trace-enabled');
	args.push('--log-level');
	args.push('debug');
	args.push('--env');
	args.push('dev');
}

var processArgs = process.argv.splice(2);
args = args.concat(processArgs);

var opt = {
	cwd: __dirname,
	env: (function() {
		process.env.NODE_PATH = '.'; // Enables require() calls relative to the cwd :)
		return process.env;
	}()),
	stdio: [process.stdin, process.stdout, process.stderr]
};

var app = spawn(process.execPath, args, opt);

// Pass on the exit code
app.on('close', (code) => {
	process.exit(code);
});