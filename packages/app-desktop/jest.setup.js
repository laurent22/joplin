
const { default: Logger, TargetType } = require('@joplin/utils/Logger');
const initLib = require('@joplin/lib/initLib').default;

// TODO: Some libraries required by test-utils.js seem to fail to import with the
// jsdom environment.
//
// Thus, require('@joplin/lib/testing/test-utils.js') fails and some setup must be
// copied.

const logger = new Logger();
logger.addTarget(TargetType.Console);
logger.setLevel(Logger.LEVEL_WARN);
Logger.initializeGlobalLogger(logger);
initLib(logger);


// @electron/remote requires electron to be running. Mock it.
jest.mock('@electron/remote', () => {
	return {
		require: () => {
			return {
				default: {},
			};
		},
	};
});
