import Logger, { LogLevel, TargetType } from '@joplin/utils/Logger';

const initiateLogger = () => {
	const globalLogger = new Logger();
	globalLogger.addTarget(TargetType.Console, {
		format: (level: LogLevel, _prefix: string | undefined) => {
			if (level === LogLevel.Info) return '%(date_time)s: %(prefix)s: %(message)s';
			return '%(date_time)s: [%(level)s] %(prefix)s: %(message)s';
		},
	});
	Logger.initializeGlobalLogger(globalLogger);

};

export default initiateLogger;
