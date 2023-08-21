import Logger, { LogLevel } from '@joplin/utils/Logger';
const { sprintf } = require('sprintf-js');
const moment = require('moment');

const loggerFormatter = (instancePrefix: string) => {

	return (level: LogLevel, targetPrefix: string) => {
		switch (level) {
		case LogLevel.Info:
			return sprintf(`%(date_time)s: ${instancePrefix}%(prefix)s: %(message)s`, {
				date_time: moment().format('YYYY-MM-DD HH:mm:ss'),
				level: Logger.levelIdToString(level),
				prefix: targetPrefix || '',
				message: '',
			});
		default:
			return sprintf(`%(date_time)s: ${instancePrefix}[%(level)s] %(prefix)s: %(message)s`, {
				date_time: moment().format('YYYY-MM-DD HH:mm:ss'),
				level: Logger.levelIdToString(level),
				prefix: targetPrefix || '',
				message: '',
			});
		}
	};
};

export default loggerFormatter;
