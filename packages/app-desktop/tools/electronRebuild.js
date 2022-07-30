const execCommand = function(command) {
	const exec = require('child_process').exec;

	console.info(`Running: ${command}`);

	return new Promise((resolve, reject) => {
		exec(command, (error, stdout) => {
			if (error) {
				if (error.signal === 'SIGTERM') {
					resolve('Process was killed');
				} else {
					reject(error);
				}
			} else {
				resolve(stdout.trim());
			}
		});
	});
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
	const forceAbiArgs = '--force-abi 89';

	if (isWindows()) {
		// Cannot run this in parallel, or the 64-bit version might end up
		// with 32-bit files and vice-versa
		console.info(await execCommand(['yarn', 'run', 'electron-rebuild', forceAbiArgs, '--arch ia32'].join(' ')));
		console.info(await execCommand(['yarn', 'run', 'electron-rebuild', forceAbiArgs, '--arch x64'].join(' ')));
	} else {
		console.info(await execCommand(['yarn', 'run', 'electron-rebuild', forceAbiArgs].join(' ')));
	}
}

module.exports = main;
