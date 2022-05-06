import yargs = require('yargs');
import { chdir } from 'process';
import { execCommand2, rootDir } from './tool-utils';

const main = async () => {
	const argv = await yargs.argv;
	const filePaths = argv._ as string[];
	if (!filePaths || !filePaths.length) return;

	chdir(rootDir);

	try {
		await execCommand2(['yarn', 'run', 'cspell'].concat(filePaths), { showStderr: false, showStdout: false });
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
