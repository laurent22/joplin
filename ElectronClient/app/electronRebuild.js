const execCommand = function(command) {
	const exec = require('child_process').exec

	console.info('Running: ' + command);

	return new Promise((resolve, reject) => {
		let childProcess = exec(command, (error, stdout, stderr) => {
			if (error) {
				if (error.signal == 'SIGTERM') {
					resolve('Process was killed');
				} else {
					reject(error);
				}
			} else {
				resolve(stdout.trim());
			}
		});
	});
}

const isLinux = () => {
	return process && process.platform === 'linux';
}

const isWindows = () => {
	return process && process.platform === 'win32';
}

const isMac = () => {
	return process && process.platform === 'darwin';
}

async function main() {
	// electron-rebuild --arch ia32 && electron-rebuild --arch x64

	let exePath = __dirname + '/node_modules/.bin/electron-rebuild';
	if (isWindows()) exePath += '.cmd';

	if (isWindows()) {
		console.info(await execCommand(['"' + exePath + '"', '--arch ia32'].join(' ')));
		console.info(await execCommand(['"' + exePath + '"', '--arch x64'].join(' ')));
	} else {
		console.info(await execCommand(['"' + exePath + '"'].join(' ')));
	}	
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});