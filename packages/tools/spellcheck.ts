import yargs = require('yargs');
import { chdir } from 'process';
import { rootDir } from './tool-utils';
import { execCommand } from '@joplin/utils';

const main = async () => {
	const argv = await yargs.argv;
	const filePaths = argv._ as string[];
	const processAll = !!argv.all;
	if (!processAll) {
		if (!filePaths || !filePaths.length) return;
	}

	chdir(rootDir);

	let cmd = [
		'yarn', 'cspell',
		'--no-progress',
		'--no-summary',
		'--config', 'cspell.json',
	];

	if (processAll) {
		cmd.push('**/*.{ts,tsx,md,mdx}');
	} else {
		cmd = cmd.concat(filePaths);
	}

	try {
		await execCommand(cmd, { showStderr: false, showStdout: false });
	} catch (error) {
		if (!error.stdout.trim()) return;

		console.error(`Some spelling mistakes were found:\n${error.stdout}`);
		process.exit(1);
	}
};

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
