import yargs = require('yargs');
import { chdir } from 'process';
import { rootDir } from './tool-utils';
import { execCommand } from '@joplin/utils';
import { fileExtension } from '@joplin/utils/path';

const supportedExtensions = ['ts', 'tsx', 'md', 'mdx'];

const main = async () => {
	const argv = await yargs.argv;
	let filePaths = (argv._ as string[]) || [];
	const processAll = !!argv.all;

	filePaths = filePaths.filter(f => supportedExtensions.includes(fileExtension(f).toLowerCase()));

	if (!processAll && !filePaths.length) return;

	chdir(rootDir);

	let cmd = [
		'yarn', 'cspell',
		'--no-progress',
		'--no-summary',
		'--config', 'cspell.json',
	];

	if (processAll) {
		cmd.push(`**/*.{${supportedExtensions.join(',')}}`);
	} else {
		cmd = cmd.concat(filePaths);
	}

	try {
		await execCommand(cmd, { showStderr: false, showStdout: false });
	} catch (error) {
		if (!error.stdout.trim()) return;
		console.error(`The following spelling mistakes were found. Please check https://joplinapp.org/help/dev/spellcheck for\ninformation on how to deal with spelling mistakes.\n\n${error.stdout}`);
		process.exit(1);
	}
};

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
