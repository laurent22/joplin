import { afterAllTests, beforeAllDb, createdDbPath, models } from './testUtils';
import populateDatabase from '../../tools/debug/populateDatabase';
import Logger, { LogLevel, TargetType } from '@joplin/utils/Logger';
const { shimInit } = require('@joplin/lib/shim-init-node.js');
const nodeSqlite = require('sqlite3');

let logger_: Logger = null;

const logger = () => {
	if (!logger_) {
		logger_ = new Logger();
		logger_.addTarget(TargetType.Console);
		logger_.setLevel(LogLevel.Debug);
	}
	return logger_;
};

const main = async () => {
	// options = {
	// 	userCount: 10,
	// 	minNoteCountPerUser: 0,
	// 	maxNoteCountPerUser: 1000,
	// 	minFolderCountPerUser: 0,
	// 	maxFolderCountPerUser: 50,
	// 	...options,
	// };

	shimInit({ nodeSqlite });
	await beforeAllDb('populateDatabase');

	logger().info(`Populating database: ${createdDbPath()}`);

	await populateDatabase(models(), {
		userPrefix: 'test',
		actionCount: 6000,
		userCount: 10,
	});

	await afterAllTests();
};

main().catch((error) => {
	logger().error('Fatal error', error);
	process.exit(1);
});
