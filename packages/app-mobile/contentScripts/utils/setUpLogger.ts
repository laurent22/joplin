import Logger, { TargetType } from '@joplin/utils/Logger';

let loggerCreated = false;
const setUpLogger = () => {
	if (!loggerCreated) {
		const logger = new Logger();
		logger.addTarget(TargetType.Console);
		logger.setLevel(Logger.LEVEL_WARN);
		Logger.initializeGlobalLogger(logger);
		loggerCreated = true;
	}
};

export default setUpLogger;
