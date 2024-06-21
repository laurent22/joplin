import { join, resolve } from 'path';
import bridge from '../../services/bridge';

const pathToBundled7Zip = () => {
	// 7zip-bin is very large -- return the path to a version of 7zip
	// copied from 7zip-bin.
	const executableName = process.platform === 'win32' ? '7za.exe' : '7za';
	const baseDir = join(bridge().buildDir(), '7zip');

	return { baseDir, executableName, fullPath: resolve(join(baseDir, executableName)) };
};

export default pathToBundled7Zip;
