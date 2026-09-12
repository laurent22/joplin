import { execCommand } from '@joplin/utils';
import yargs = require('yargs');
import { hideBin } from 'yargs/helpers';

async function main(version: string, imageName: string) {
	console.log('Marking version', version, 'of image', imageName, 'as latest...');

	const doManifest = (...args: string[]) => {
		return execCommand(['docker', 'manifest', ...args]);
	};
	const doManifestQuiet = (...args: string[]) => {
		return execCommand(['docker', 'manifest', ...args], { quiet: true });
	};

	try {
		await doManifestQuiet('rm', `${imageName}:latest`);
	} catch (_error) {
		// The local manifest may not exist (e.g. first run, or after a previous push),
		// in which case `docker manifest rm` fails. That's fine — we're about to recreate it.
	}
	await doManifest('create', `${imageName}:latest`, `${imageName}:arm64-${version}`, `${imageName}:amd64-${version}`);
	await doManifest('annotate', `${imageName}:latest`, `${imageName}:arm64-${version}`, '--arch=arm64');
	await doManifest('annotate', `${imageName}:latest`, `${imageName}:amd64-${version}`, '--arch=amd64');
	await doManifest('push', `${imageName}:latest`);
}

if (require.main === module) {
	void (async () => {
		try {
			const args = await yargs(hideBin(process.argv))
				.usage('$0 [image-version]', 'Tags a specific image version with latest', yargs => {
					return yargs
						.positional('image-version', {
							type: 'string',
							describe: 'Version of the image to set as latest',
						})
						.option('image-name', {
							type: 'string',
							describe: 'Docker image name to act on',
							default: 'joplin/server',
						});
				})
				.demandOption('image-version')
				.parse();
			await main(args['image-version'] as string, args['image-name'] as string);
		} catch (error) {
			console.error('Fatal error');
			console.error(error);
			process.exit(1);
		}
	})();
}
