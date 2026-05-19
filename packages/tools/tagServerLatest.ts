import { execCommand } from '@joplin/utils';

async function main() {
	const argv = require('yargs').argv;
	if (!argv._.length) throw new Error('Version number is required');

	const version = argv._[0];

	const imageName = 'joplin/server';

	try {
		await execCommand('docker manifest rm joplin/server:latest', { quiet: true });
	} catch (_error) {
		// The local manifest may not exist (e.g. first run, or after a previous push),
		// in which case `docker manifest rm` fails. That's fine — we're about to recreate it.
	}
	await execCommand(`docker manifest create ${imageName}:latest ${imageName}:arm64-${version} ${imageName}:amd64-${version}`);
	await execCommand(`docker manifest annotate ${imageName}:latest ${imageName}:arm64-${version} --arch arm64`);
	await execCommand(`docker manifest annotate ${imageName}:latest ${imageName}:amd64-${version} --arch amd64`);
	await execCommand(`docker manifest push ${imageName}:latest`);
}

if (require.main === module) {
// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
	main().catch((error) => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
}
