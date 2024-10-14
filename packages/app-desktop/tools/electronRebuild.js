const execCommand = require('./execCommand');

const isArm64 = () => {
	return process.platform === 'arm64';
};

const isWindows = () => {
	return process && process.platform === 'win32';
};

async function main() {
	// electron-rebuild --arch ia32 && electron-rebuild --arch x64

	// console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
	// console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!ELECTRON REBUILD IS DISABLED!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
	// console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
	// return;

	// let exePath = `${__dirname}/../node_modules/.bin/electron-rebuild`;
	// if (isWindows()) exePath += '.cmd';

	process.chdir(`${__dirname}/..`);

	// We need to force the ABI because Electron Builder or node-abi picks the
	// wrong one. However it means it will have to be manually upgraded for each
	// new Electron release. Some ABI map there:
	// https://github.com/electron/node-abi/tree/master/test
	const forceAbiArgs = '--force-abi 128';

	if (isWindows()) {
		// Cannot run this in parallel, or the 64-bit version might end up
		// with 32-bit files and vice-versa
		console.info(await execCommand(['yarn', 'run', 'electron-rebuild', forceAbiArgs, '--arch ia32'].join(' ')));
		console.info(await execCommand(['yarn', 'run', 'electron-rebuild', forceAbiArgs, '--arch x64'].join(' ')));
	} else if (isArm64()) {
		// Keytar needs it's own electron-rebuild or else it will not fetch the
		// existing prebuilt binary, this will cause cross-compilation to fail.
		// E.g. for MacOS arm64 it will download:
		// https://github.com/atom/node-keytar/releases/download/v7.9.0/keytar-v7.9.0-napi-v3-darwin-arm64.tar.gz
		console.info(await execCommand(['yarn', 'run', 'electron-rebuild', forceAbiArgs, '--arch=arm64', '--only=keytar'].join(' ')));
		console.info(await execCommand(['yarn', 'run', 'electron-rebuild', forceAbiArgs].join(' ')));
	} else {
		console.info(await execCommand(['yarn', 'run', 'electron-rebuild', forceAbiArgs].join(' ')));
	}
}

module.exports = main;
