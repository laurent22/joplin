const { copy, mkdirp, remove } = require('fs-extra');

const msleep = async (ms) => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
};

// Same as copyApplicationAssets - probably both scripts should be merged in
// one.
const withRetry = async (fn) => {
	for (let i = 0; i < 5; i++) {
		try {
			await fn();
			return;
		} catch (error) {
			console.warn(`withRetry: Failed calling function - will retry (${i})`, error);
			await msleep(1000 + i * 1000);
		}
	}

	throw new Error('withRetry: Could not run function after multiple attempts');
};

async function main() {
	const rootDir = `${__dirname}/..`;

	const sourceDir = `${rootDir}/../../packages/renderer/assets`;
	const destDirs = [
		`${rootDir}/gui/note-viewer/pluginAssets`,
		`${rootDir}/pluginAssets`,
	];

	for (const action of ['delete', 'copy']) {
		for (const destDir of destDirs) {
			if (action === 'delete') {
				await withRetry(() => remove(destDir));
			} else {
				console.info(`Copying to ${destDir}`);
				await withRetry(() => mkdirp(destDir));
				await withRetry(() => copy(sourceDir, destDir, { overwrite: true }));
			}
		}
	}
}

module.exports = main;
