require('app-module-path').addPath(`${__dirname}/..`);
require('source-map-support').install();

import db from '../app/db';

const config = {
	directory: `${__dirname}/../migrations`,
	// Disable transactions because the models might open one too
	disableTransactions: true,
};

console.info(`Running migrations in: ${config.directory}`);

db.migrate.latest(config).then(([log]) => {
	if (!log.length) {
		console.info('Database is already up to date');
	} else {
		console.info(`Ran migrations: ${log.join(', ')}`);
	}

	db.destroy();
}).catch(error => {
	console.error(error);
	process.exit(1);
});
