import { fork } from 'node:child_process';
import { join } from 'node:path';

// This script starts the server with a customized environment. This is useful
// for enabling global NodeJS hardening options.

const getServerEnv = () => {
	const nodeOptions = [
		// Hardening: Disallow code execution through 'eval' and 'new Function'
		// Disabled for now: Some libraries still use eval():
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

	child.on('exit', (code, signal) => {
		// The child process either exits with a signal or an exit code.
		// See https://nodejs.org/api/child_process.html#event-exit
		if (signal) {
			process.kill(process.pid, signal);
		} else {
			process.exit(code ?? 1);
		}
	});

	process.on('SIGTERM', () => child.kill('SIGTERM'));
	process.on('SIGINT', () => child.kill('SIGINT'));
};

main();
