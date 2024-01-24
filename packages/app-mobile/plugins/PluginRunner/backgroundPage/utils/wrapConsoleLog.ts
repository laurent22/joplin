import { LogLevel } from '../../types';

/* eslint-disable no-console */

type OnLogCallback = (level: LogLevel, message: string)=> void;

// Wraps console.info, console.error, console.warn
const wrapConsoleLog = (onLog: OnLogCallback) => {
	// inOnLogCallback keeps track of whether onLog is currently being called or not.
	// This helps prevent StackOverflows if onLog itself calls console.log/console.error.
	let inOnLogCallback = false;

	const wrapLogFunction = (key: keyof typeof console, logLevel: LogLevel) => {
		const originalLog = (console[key] as any) ?? (()=>{});

		console[key] = function(...args: any[]) {
			originalLog.call(this, ...args);
			if (inOnLogCallback) return;

			// Work around
			//   Uncaught (in promise) TypeError: Cannot convert object to primitive value
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

			try {
				inOnLogCallback = true;
				onLog(logLevel, argsString);
			} finally {
				inOnLogCallback = false;
			}
		} as any;
	};

	wrapLogFunction('timeLog', LogLevel.Debug);
	wrapLogFunction('log', LogLevel.Debug);
	wrapLogFunction('warn', LogLevel.Warn);
	wrapLogFunction('info', LogLevel.Info);
	wrapLogFunction('error', LogLevel.Error);
};


export default wrapConsoleLog;
