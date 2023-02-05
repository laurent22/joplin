// Note: this is not working because electron-builder needs access to env
// variables which are not defined in this context. To make it work, we'll need
// to somehow pass this to the execCommand call.

const execCommand = require('./execCommand');

async function main() {
	process.chdir(`${__dirname}/..`);

	const maxTries = 3;

	for (let i = 0; i < maxTries; i++) {
		try {
			console.info(await execCommand(['yarn', 'run', 'electron-builder'].join(' ')));
			console.info('electronBuilder: electron-builder completed successfully');
			break;
		} catch (error) {
			console.info(error.stdout);
			console.error(error);

			if (error.stdout.includes('cannot resolve') && i !== maxTries - 1) {
				console.info(`electronBuilder: electron-builder could not download an asset - trying again (${i + 1})`);
				continue;
			} else {
				throw error;
			}
		}
	}
}

module.exports = main;
