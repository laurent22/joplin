import { Second } from '@joplin/utils/time';

const formatDuration = (durationMs: number) => {
	const round = (n: number) => Math.round(n * 100) / 100;
	if (durationMs < Second / 4) {
		return `${round(durationMs)}ms`;
	} else {
		return `${round(durationMs / Second)}s`;
	}
};

const formatTaskDuration = (durationMs: number) => {
	const formatted = formatDuration(durationMs);
	if (durationMs < Second / 2) {
		return formatted;
	} else if (durationMs < Second) {
		return `[ ${formatted} ]`;
	} else {
		// Wrap in [[ ]]s to make longer durations more visible.
		return `[[ ${formatted} ]]`;
	}
};

let timeOrigin = 0;
const formatAbsoluteTime = (time: number) => {
	return formatDuration(time - timeOrigin);
};

const hasPerformanceMarkApi = typeof performance.mark === 'function' && typeof performance.measure === 'function';

type LogCallback = (message: string)=> void;
type LogEntry = {
	isDebug: boolean;
	message: string;
};

type LoggerSlice = {
	info: (message: string)=> void;
	debug: (message: string)=> void;
};

export default class PerformanceLogger {
	// Since one of the performance logger's uses is profiling
	// startup code, it's useful to have a default log implementation
	// (for before the logger is initialized).
	private static logBuffer_: LogEntry[] = [];
	private static readonly defaultLog_: LogCallback = message => {
		this.logBuffer_.push({ message, isDebug: false });
	};
	private static readonly defaultLogDebug_: LogCallback = message => {
		this.logBuffer_.push({ message, isDebug: true });
	};
	private static log_: LogCallback = this.defaultLog_;
	private static logDebug_: LogCallback = this.defaultLogDebug_;

	// For testing
	public static reset_() {
		timeOrigin = 0;
		this.logBuffer_ = [];
		this.log_ = this.defaultLog_;
		this.logDebug_ = this.defaultLogDebug_;
	}

	// In some environments, performance.now() gives the number of milliseconds since
	// application startup. This does not seem to be the case on all environments, however,
	// so we allow customizing the app start time.
	public static onAppStartBegin() {
		const now = performance.now();
		timeOrigin = now;

		this.log_(`Starting application at ${formatDuration(now)}`);
	}

	public static setLogger(logger: LoggerSlice) {
		const tag = 'Performance';
		this.log_ = (message) => logger.info(`${tag}: ${message}`);
		this.logDebug_ = (message) => logger.debug(`${tag}: ${message}`);

		for (const item of this.logBuffer_) {
			if (item.isDebug) {
				this.logDebug_(item.message);
			} else {
				this.log_(item.message);
			}
		}
		this.logBuffer_ = [];
	}

	private lastLogTime_ = 0;
	public static create(prefix: string) {
		return new PerformanceLogger(prefix);
	}

	private constructor(private readonly prefix_: string) { }

	public mark(name: string) {
		name = `${this.prefix_}/${name}`;

		// If available, make it possible to inspect the performance mark from the F12
		// developer tools.
		if (hasPerformanceMarkApi) {
			performance.mark(name);
		}

		const now = performance.now();
		const timeDelta = now - this.lastLogTime_;
		this.lastLogTime_ = now;
		PerformanceLogger.log_(`${name}: Mark at ${formatAbsoluteTime(now)}   +${formatDuration(timeDelta)}`);
	}

	public async track<T>(name: string, task: ()=> Promise<T>): Promise<T> {
		const tracker = this.taskStart(name);
		try {
			return await task();
		} finally {
			tracker.onEnd();
		}
	}

	public taskStart(name: string) {
		name = `${this.prefix_}/${name}`;

		if (typeof performance.mark === 'function') {
			performance.mark(`${name}-start`);
		}

		const startTime = performance.now();
		this.lastLogTime_ = startTime;
		PerformanceLogger.logDebug_(`${name}: Start at ${formatAbsoluteTime(startTime)}`);

		const onEnd = () => {
			const now = performance.now();
			this.lastLogTime_ = now;
			if (hasPerformanceMarkApi) {
				performance.mark(`${name}-end`);
				performance.measure(name, `${name}-start`, `${name}-end`);
			}

			const duration = now - startTime;
			// Increase the log level for long-running tasks
			const isLong = duration >= Second / 10;
			const log = isLong ? PerformanceLogger.log_ : PerformanceLogger.logDebug_;

			log(`${name}: End at ${formatAbsoluteTime(now)} (took ${formatTaskDuration(now - startTime)})`);
		};
		return {
			onEnd,
		};
	}
}
