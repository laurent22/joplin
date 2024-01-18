import { LogLevel } from '../../types';

/* eslint-disable no-console */

type OnLogCallback = (level: LogLevel, message: string)=> void;

// Wraps console.info, console.error, console.warn
const wrapConsoleLog = (onLog: OnLogCallback) => {
	const wrapLogFunction = (key: keyof typeof console, logLevel: LogLevel) => {
		const originalLog = (console[key] as any) ?? (()=>{});

		console[key] = function(...args: any[]) {
			onLog(logLevel, args.join('   '));
			originalLog.call(this, ...args);
		} as any;
	};

	wrapLogFunction('timeLog', LogLevel.Debug);
	wrapLogFunction('log', LogLevel.Debug);
	wrapLogFunction('warn', LogLevel.Warn);
	wrapLogFunction('info', LogLevel.Info);
	wrapLogFunction('error', LogLevel.Error);
};


export default wrapConsoleLog;
