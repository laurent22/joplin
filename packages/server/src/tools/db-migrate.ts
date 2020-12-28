// import db, { dbConfig } from '../app/db';

// // require('source-map-support').install();

// const config = {
// 	directory: `${__dirname}/../migrations`,
// 	// Disable transactions because the models might open one too
// 	disableTransactions: true,
// };

// console.info(`Using database: ${dbConfig().connection.filename}`);
// console.info(`Running migrations in: ${config.directory}`);

// db().migrate.latest(config).then((event: any) => {
// 	const log: string[] = event[1];

// 	if (!log.length) {
// 		console.info('Database is already up to date');
// 	} else {
// 		console.info(`Ran migrations: ${log.join(', ')}`);
// 	}

// 	db().destroy();
// }).catch((error:any) => {
// 	console.error(error);
// 	process.exit(1);
// });
