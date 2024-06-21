
import { copy } from 'fs-extra';
import { dirname, join } from 'path';

const copy7Zip = async () => {
	// We allow building for a different architecture/platform with
	// the npm_config_target_arch and npm_config_target_platform environment variables.
	//
	// These are the same environment variables used by yarn when downloading dependencies.
	//
	const targetArch = process.env['npm_config_target_arch'] || process.arch;
	const targetPlatform = process.env['npm_config_target_platform'] || process.platform;

	console.info('Copying 7zip for platform', targetPlatform, 'and architecture', targetArch);

	// To use the custom architecture/platform, we copy the relevant files from 7zip-bin
	// directly:

	const sevenZipBinDirectory = dirname(require.resolve('7zip-bin'));
	const platformToSubdirectory: Record<string, string> = {
		'win32': 'win',
		'darwin': 'mac',
		'linux': 'linux',
	};

	if (!(targetPlatform in platformToSubdirectory)) {
		throw new Error(`Invalid target platform ${targetPlatform}. Must be in ${Object.keys(platformToSubdirectory)}`);
	}

	const fileName = targetPlatform === 'win32' ? '7za.exe' : '7za';
	const pathTo7za = join(
		sevenZipBinDirectory, platformToSubdirectory[targetPlatform], targetArch, fileName,
	);

	const rootDir = dirname(__dirname);
	const outputPath = join(rootDir, 'build', '7zip', fileName);
	await copy(pathTo7za, outputPath);
};

export default copy7Zip;
