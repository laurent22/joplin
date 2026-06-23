import Logger, { TargetType } from '@joplin/utils/Logger';
import { fork } from 'node:child_process';
import { join } from 'node:path';

// This script starts the server with a customized environment. This is useful
// for enabling global NodeJS hardening options.

const globalLogger = new Logger();
globalLogger.addTarget(TargetType.Console);
Logger.initializeGlobalLogger(globalLogger);

const logger = Logger.create('index');

const getHardeningLevel = () => {
	const hardeningLevel = Number(process.env.JOPLIN_HARDENING_LEVEL || '0');
	if (!isFinite(hardeningLevel)) throw new Error('Invalid environment: JOPLIN_HARDENING_LEVEL must be an integer or undefined');
	return hardeningLevel;
};

const getServerEnv = () => {
	const hardeningLevel = getHardeningLevel();
	if (hardeningLevel === 0) return process.env;

	logger.info('Starting with certain NodeJS hardening options enabled.');

	const nodeOptions = [
		// Hardening: Disallow code execution through 'eval' and 'new Function'
		'--disallow-code-generation-from-strings',
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

// Omit the NodeJS process name and file path arguments:
const argv = process.argv.slice(2);
const child = fork(join(__dirname, 'app.js'), argv, {
	env: getServerEnv(),
	detached: false,
});

child.on('exit', (code) => {
	process.exit(code ?? child.exitCode ?? 0);
});

process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
