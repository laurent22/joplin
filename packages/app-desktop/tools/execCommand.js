import { exec } from 'child_process';
const execCommand = (command) => {

	console.info(`Running: ${command}`);

	return new Promise((resolve, reject) => {
		exec(command, (error, stdout) => {
			if (error) {
				if (error.signal === 'SIGTERM') {
					resolve('Process was killed');
				} else {
					error.stdout = stdout;
					reject(error);
				}
			} else {
				resolve(stdout.trim());
			}
		});
	});
};

module.exports = execCommand;
