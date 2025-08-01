import { execCommand } from '@joplin/utils';

async function main() {
	const argv = require('yargs').argv;
	if (!argv._.length) throw new Error('Version number is required');

	const version = argv._[0];

	const imageName = 'joplin/server';

	// docker manifest create joplin/server:latest joplin/server:arm64-3.3.13 joplin/server:amd64-3.3.13
	// docker manifest annotate joplin/server:latest joplin/server:arm64-3.3.13 --arch arm64
	// docker manifest annotate joplin/server:latest joplin/server:amd64-3.3.13 --arch amd64
	// docker manifest push joplin/server:latest

	await execCommand('docker manifest rm joplin/server:latest');
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
