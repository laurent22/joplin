const execCommand = function(command) {
	const exec = require('child_process').exec;

	console.info(`Running: ${command}`);

	return new Promise((resolve, reject) => {
		exec(command, (error, stdout) => {
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
};

const isWindows = () => {
	return process && process.platform === 'win32';
};

async function main() {
	// electron-rebuild --arch ia32 && electron-rebuild --arch x64

	let exePath = `${__dirname}/../node_modules/.bin/electron-rebuild`;
	if (isWindows()) exePath += '.cmd';

	process.chdir(`${__dirname}/..`);

	if (isWindows()) {
		console.info(await execCommand([`"${exePath}"`, '--arch ia32'].join(' ')));
		console.info(await execCommand([`"${exePath}"`, '--arch x64'].join(' ')));
	} else {
		console.info(await execCommand([`"${exePath}"`].join(' ')));
	}
}

module.exports = main;
