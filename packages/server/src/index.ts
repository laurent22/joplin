import { fork } from 'node:child_process';
import { join } from 'node:path';

// This script starts the server with a customized environment. This is useful
// for enabling global NodeJS hardening options.

const getServerEnv = () => {
	const nodeOptions = [
		// Hardening: Disallow code execution through 'eval' and 'new Function'
		// Disabled, pending further verification that this doesn't break anything:
		// '--disallow-code-generation-from-strings',

		// Disable the __proto__ property:
		// Ref: https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html#nodejs-configuration-flag
		'--disable-proto=delete',
	];

	return {
		...process.env,

		'NODE_OPTIONS': [
			process.env.NODE_OPTIONS ?? '',
			...nodeOptions,
		].join(' '),
	};
};

const main = () => {
	// Omit the NodeJS process name and file path arguments:
	const argv = process.argv.slice(2);
	const child = fork(join(__dirname, 'app.js'), argv, {
		env: getServerEnv(),
		detached: false,
	});

	// Forward signals to the child process
	const onSigterm = () => child.kill('SIGTERM');
	const onSigint = () => child.kill('SIGINT');
	process.on('SIGTERM', onSigterm);
	process.on('SIGINT', onSigint);

	child.on('exit', (code, signal) => {
		process.off('SIGTERM', onSigterm);
		process.off('SIGINT', onSigint);

		// The child process either exits with a signal or an exit code.
		// See https://nodejs.org/api/child_process.html#event-exit
		if (signal) {
			process.kill(process.pid, signal);
		} else {
			process.exit(code ?? 1);
		}
	});
};

main();
