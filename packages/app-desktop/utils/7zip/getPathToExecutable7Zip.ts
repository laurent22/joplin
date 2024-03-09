import Setting from '@joplin/lib/models/Setting';
import pathToBundled7Zip from './pathToBundled7Zip';
import { join } from 'path';
import shim from '@joplin/lib/shim';

const pathTo7Za_: undefined|string = undefined;

const getPathToExecutable7Zip = async () => {
	if (pathTo7Za_) {
		return pathTo7Za_;
	}

	const { baseDir: bundled7ZipDir, executableName, fullPath: bundled7ZipExecutablePath } = pathToBundled7Zip();
	let pathTo7Za = bundled7ZipExecutablePath;

	// On Linux (and perhaps Free/OpenBSD?), the bundled 7zip binary can't be executed
	// in its default location and must be moved.
	if (!shim.isMac() && !shim.isWindows()) {
		const targetDir = join(Setting.value('cacheDir'), '7zip');

		const fsDriver = shim.fsDriver();
		const executablePath = join(targetDir, executableName);

		let needsUpdate;

		// The 7Zip binary may already be copied, in which case, it may not need to be updated.
		if (await shim.fsDriver().exists(targetDir)) {
			const currentChecksum = await fsDriver.md5File(executablePath);
			const bundledChecksum = await fsDriver.md5File(bundled7ZipExecutablePath);

			if (currentChecksum !== bundledChecksum) {
				needsUpdate = true;
				await shim.fsDriver().remove(targetDir);
			} else {
				needsUpdate = false;
			}
		} else {
			needsUpdate = true;
		}

		if (needsUpdate) {
			await shim.fsDriver().mkdir(targetDir);
			await shim.fsDriver().copy(bundled7ZipDir, targetDir);

			// Make executable.
			//   Self: read+write+execute
			//   Group: read+execute
			//   Other: none
			await shim.fsDriver().chmod(executablePath, 0o750);
		}

		pathTo7Za = executablePath;
	}

	return pathTo7Za;
};

export default getPathToExecutable7Zip;
