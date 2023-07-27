
const { default: Logger, TargetType } = require('@joplin/lib/Logger');

// TODO: Some libraries required by test-utils.js seem to fail to import with the
// jsdom environment.
//
// Thus, require('@joplin/lib/testing/test-utils.js') fails and some setup must be
// copied.

const logger = new Logger();
logger.addTarget(TargetType.Console);
logger.setLevel(Logger.LEVEL_WARN);
Logger.initializeGlobalLogger(logger);


// @electron/remote requires electron to be running. Mock it.
jest.mock('@electron/remote', () => {
	return { require };
});
