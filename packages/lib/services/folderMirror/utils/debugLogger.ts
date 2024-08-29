import Logger, { LogLevel, TargetType } from '@joplin/utils/Logger';

const debugLogger = new Logger();
debugLogger.addTarget(TargetType.Console);
debugLogger.setLevel(LogLevel.Debug);
debugLogger.enabled = false;

export default debugLogger;
