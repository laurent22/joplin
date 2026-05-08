import Logger, { LogLevel, TargetType } from '@joplin/utils/Logger';

const setUpLogger = () => {
	// To prevent warnings when testing focus-related logic (due to
	// logging in focusHandler.ts):
	const logger = new Logger();
	logger.addTarget(TargetType.Console);
	logger.setLevel(LogLevel.Warn);
	Logger.initializeGlobalLogger(logger);
};

export default setUpLogger;
