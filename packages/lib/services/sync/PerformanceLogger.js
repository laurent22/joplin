"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const time_1 = require("@joplin/utils/time");
const formatDuration = (durationMs) => {
    const round = (n) => Math.round(n * 100) / 100;
    if (durationMs < time_1.Second / 4) {
        return `${round(durationMs)}ms`;
    }
    else {
        return `${round(durationMs / time_1.Second)}s`;
    }
};
const formatTaskDuration = (durationMs) => {
    const formatted = formatDuration(durationMs);
    if (durationMs < time_1.Second / 2) {
        return formatted;
    }
    else if (durationMs < time_1.Second) {
        return `[ ${formatted} ]`;
    }
    else {
        // Wrap in [[ ]]s to make longer durations more visible.
        return `[[ ${formatted} ]]`;
    }
};
let timeOrigin = 0;
const formatAbsoluteTime = (time) => {
    return formatDuration(time - timeOrigin);
};
const hasPerformanceMarkApi = typeof performance.mark === 'function' && typeof performance.measure === 'function';
class PerformanceLogger {
    // For testing
    static reset_() {
        timeOrigin = 0;
        this.logBuffer_ = [];
        this.log_ = this.defaultLog_;
        this.logDebug_ = this.defaultLogDebug_;
    }
    // In some environments, performance.now() gives the number of milliseconds since
    // application startup. This does not seem to be the case on all environments, however,
    // so we allow customizing the app start time.
    static onAppStartBegin() {
        const now = performance.now();
        timeOrigin = now;
        this.log_(`Starting application at ${formatDuration(now)}`);
    }
    static setLogger(logger) {
        const tag = 'Performance';
        this.log_ = (message) => logger.info(`${tag}: ${message}`);
        this.logDebug_ = (message) => logger.debug(`${tag}: ${message}`);
        for (const item of this.logBuffer_) {
            if (item.isDebug) {
                this.logDebug_(item.message);
            }
            else {
                this.log_(item.message);
            }
        }
        this.logBuffer_ = [];
    }
    static create() {
        return new _a();
    }
    constructor() {
        this.lastLogTime_ = 0;
        this.startCounter_ = 0;
    }
    mark(name) {
        // If available, make it possible to inspect the performance mark from the F12
        // developer tools.
        if (hasPerformanceMarkApi) {
            performance.mark(name);
        }
        const now = performance.now();
        const timeDelta = now - this.lastLogTime_;
        this.lastLogTime_ = now;
        _a.log_(`${name}: Mark at ${formatAbsoluteTime(now)}   +${formatDuration(timeDelta)}`);
    }
    async track(name, task) {
        const tracker = this.taskStart(name);
        try {
            return await task();
        }
        finally {
            tracker.onEnd();
        }
    }
    taskStart(name) {
        // To prevent incorrect output in the browser's visual performance graph, the IDs
        // passed to "performance.mark" need to be unique (or at least no other task with
        // the same ID should be running at the same time). Add a counter to the task name
        // to handle the case where two tasks with the otherwise same name run at the same
        // time:
        const uniqueTaskId = `${name}-${(this.startCounter_++)}`;
        if (typeof performance.mark === 'function') {
            performance.mark(`${uniqueTaskId}-start`);
        }
        const startTime = performance.now();
        this.lastLogTime_ = startTime;
        _a.logDebug_(`${name}: Start at ${formatAbsoluteTime(startTime)}`);
        const onEnd = () => {
            const now = performance.now();
            this.lastLogTime_ = now;
            if (hasPerformanceMarkApi) {
                performance.mark(`${uniqueTaskId}-end`);
                performance.measure(name, `${uniqueTaskId}-start`, `${uniqueTaskId}-end`);
            }
            const duration = now - startTime;
            // Increase the log level for long-running tasks
            const isLong = duration >= time_1.Second / 10;
            const log = isLong ? _a.log_ : _a.logDebug_;
            log(`${name}: End at ${formatAbsoluteTime(now)} (took ${formatTaskDuration(now - startTime)})`);
        };
        return {
            onEnd,
        };
    }
}
_a = PerformanceLogger;
// Since one of the performance logger's uses is profiling
// startup code, it's useful to have a default log implementation
// (for before the logger is initialized).
PerformanceLogger.logBuffer_ = [];
PerformanceLogger.defaultLog_ = message => {
    _a.logBuffer_.push({ message, isDebug: false });
};
PerformanceLogger.defaultLogDebug_ = message => {
    _a.logBuffer_.push({ message, isDebug: true });
};
PerformanceLogger.log_ = _a.defaultLog_;
PerformanceLogger.logDebug_ = _a.defaultLogDebug_;
exports.default = PerformanceLogger;
