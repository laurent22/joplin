import { join, resolve, basename, dirname } from 'path';

const pathToBundled7Zip = () => {
	// 7zip-bin is very large -- return the path to a version of 7zip
	// copied from 7zip-bin.
	const executableName = process.platform === 'win32' ? '7za.exe' : '7za';

	let rootDir = dirname(dirname(__dirname));

	// When bundled, __dirname points to a file within app.asar. The build/ directory
	// is outside of app.asar, and thus, we need an extra dirname(...).
	if (basename(rootDir).startsWith('app.asar')) {
		rootDir = dirname(rootDir);
	}

	const baseDir = join(rootDir, 'build', '7zip');

	return { baseDir, executableName, fullPath: resolve(join(baseDir, executableName)) };
};

export default pathToBundled7Zip;
