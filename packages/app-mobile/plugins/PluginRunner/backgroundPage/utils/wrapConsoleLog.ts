import { LogLevel } from '../../types';

/* eslint-disable no-console */

type OnLogCallback = (level: LogLevel, message: string)=> void;

// Wraps console.info, console.error, console.warn
const wrapConsoleLog = (onLog: OnLogCallback) => {
	const wrapLogFunction = (key: keyof typeof console, logLevel: LogLevel) => {
		const originalLog = (console[key] as any) ?? (()=>{});

		console[key] = function(...args: any[]) {
			originalLog.call(this, ...args);

			// Work around
			//  Uncaught (in promise) TypeError: Cannot convert object to primitive value
			// when console.log is called with an object that
			// can't be converted to a string.
			let argsString;
			try {
				argsString = args.join('   ');
			} catch (error) {
				argsString = `Error converting console arguments to string: ${error}`;
			}

			// Don't send very long log messages.
			const maxLength = 4096;
			if (argsString.length > maxLength) {
				argsString = `${argsString.substring(0, maxLength)}...`;
			}

			onLog(logLevel, argsString);
		} as any;
	};

	wrapLogFunction('timeLog', LogLevel.Debug);
	wrapLogFunction('log', LogLevel.Debug);
	wrapLogFunction('warn', LogLevel.Warn);
	wrapLogFunction('info', LogLevel.Info);
	wrapLogFunction('error', LogLevel.Error);
};


export default wrapConsoleLog;
