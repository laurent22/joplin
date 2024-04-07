import { LogLevel } from '../../types';

/* eslint-disable no-console */

type OnLogCallback = (level: LogLevel, message: string)=> void;

const wrapConsoleLog = (onLog: OnLogCallback) => {
	// inOnLogCallback keeps track of whether onLog is currently being called or not.
	// This helps prevent StackOverflows if onLog itself calls console.log/console.error.
	let inOnLogCallback = false;

	const wrapLogFunction = (key: keyof typeof console, logLevel: LogLevel) => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const originalLog = (console[key] as any) ?? (()=>{});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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

			// Long messages can be slow to transfer over IPC and make other messages difficult
			// to find/read in React Native's output.
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		} as any;
	};

	wrapLogFunction('timeLog', LogLevel.Debug);
	wrapLogFunction('log', LogLevel.Debug);
	wrapLogFunction('warn', LogLevel.Warn);
	wrapLogFunction('info', LogLevel.Info);
	wrapLogFunction('error', LogLevel.Error);
};

export default wrapConsoleLog;
