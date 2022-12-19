const { readdir, stat, rm } = require('fs/promises');
const { resolve } = require('path');

const rootDir = resolve(__dirname, '../..');
const packageDir = `${rootDir}/packages`;

const main = async () => {
	const itemNames = await readdir(packageDir);

	const toDeletes = [];

	for (const itemName of itemNames) {
		const fullPath = `${packageDir}/${itemName}`;
		const s = await stat(fullPath);
		if (!s.isDirectory()) continue;

		const nodeModules = `${fullPath}/node_modules`;
		toDeletes.push(nodeModules);
	}

	toDeletes.push(`${rootDir}/node_modules`);

	const promises = [];

	for (const toDelete of toDeletes) {
		console.info(`Delete: ${toDelete}`);
		promises.push(rm(toDelete, { force: true, recursive: true }));
	}

	await Promise.all(promises);
};

main().catch((error) => {
	console.error('Fatal error', error);
	process.exit(1);
});
