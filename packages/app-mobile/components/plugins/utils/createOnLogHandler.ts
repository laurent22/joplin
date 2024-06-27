import Plugin from '@joplin/lib/services/plugins/Plugin';
import { LoggerWrapper } from '@joplin/utils/Logger';
import { LogLevel } from '../types';

const createOnLogHander = (plugin: Plugin, pluginLogger: LoggerWrapper) => {
	return async (level: LogLevel, message: string) => {
		if (level === LogLevel.Info) {
			pluginLogger.info(message);
		} else if (level === LogLevel.Warn) {
			pluginLogger.warn(message);
		} else if (level === LogLevel.Error) {
			pluginLogger.error(message);
			plugin.hasErrors = true;
		} else {
			pluginLogger.debug(message);
		}
	};
};

export default createOnLogHander;
