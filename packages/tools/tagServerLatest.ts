import { execCommand2 } from './tool-utils';

async function main() {
	const argv = require('yargs').argv;
	if (!argv._.length) throw new Error('Version number is required');

	const version = argv._[0];

	await execCommand2(`docker pull "joplin/server:${version}"`);
	await execCommand2(`docker tag "joplin/server:${version}" "joplin/server:latest"`);
	await execCommand2('docker push joplin/server:latest');
}

if (require.main === module) {
// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
	main().catch((error) => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
}
