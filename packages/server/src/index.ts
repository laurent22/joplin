import { fork } from 'node:child_process';
import { join } from 'node:path';

// Omit the NodeJS process name and file path arguments:
const argv = process.argv.slice(2);
const child = fork(join(__dirname, 'app.js'), argv, {
	env: {
		...process.env,
		// Hardening: Disallow code execution through 'eval' and 'new Function'
		'NODE_OPTIONS': [
			process.env.NODE_OPTIONS ?? '',
			'--disallow-code-generation-from-strings',
		].join(' '),
	},
	detached: false,
});

child.on('exit', (code) => {
	process.exit(code ?? child.exitCode ?? 0);
});

process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
