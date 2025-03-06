import dayjs = require('dayjs');
import dayJsUtc = require('dayjs/plugin/utc');
import dayJsDuration = require('dayjs/plugin/duration');
import dayJsTimezone = require('dayjs/plugin/timezone');
import { LoggerWrapper } from '@joplin/utils/Logger';

function defaultTimezone() {
	return dayjs.tz.guess();
}

function initDayJs() {
	dayjs.extend(dayJsDuration);
	dayjs.extend(dayJsUtc);
	dayjs.extend(dayJsTimezone);
	dayjs.tz.setDefault(defaultTimezone());
}

initDayJs();

export const Second = 1000;
export const Minute = 60 * Second;
export const Hour = 60 * Minute;
export const Day = 24 * Hour;
export const Week = 7 * Day;
export const Month = 30 * Day;

export function msleep(ms: number) {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve(null);
		}, ms);
	});
}

export function formatDateTime(ms: number | Date): string {
	if (!ms) return '-';
	ms = ms instanceof Date ? ms.getTime() : ms;
	return `${dayjs(ms).format('D MMM YY HH:mm:ss')} (${defaultTimezone()})`;
}

export const durationToMilliseconds = (durationIso8601: string) => {
	const d = dayjs.duration(durationIso8601).asMilliseconds();
	if (isNaN(d)) throw new Error(`Invalid ISO 8601 duration: ${durationIso8601}`);
	return d;
};

export const isIso8601Duration = (s: string) => {
	return s.startsWith('P');
};

// Use the utility functions below to easily measure performance of a block or
// line of code.
interface PerfTimer {
	name: string;
	startTime: number;
}

const perfTimers_: PerfTimer[] = [];

export function timerPush(name: string) {
	perfTimers_.push({ name, startTime: Date.now() });
}

export function timerPop() {
	const t = perfTimers_.pop();
	// eslint-disable-next-line no-console
	console.info(`Time: ${t.name}: ${Date.now() - t.startTime}`);
}

interface PerformanceTimerInfo {
	id: number;
	name: string;
	startTime: number;
}

export class PerformanceTimer {

	private logger_: LoggerWrapper|typeof console = null;
	private prefix_ = '';
	private timers_: PerformanceTimerInfo[] = [];
	private enabled_ = true;
	private id_ = 1;

	public constructor(logger: LoggerWrapper|typeof console, prefix: string) {
		this.logger_ = logger;
		this.prefix_ = prefix;
	}

	public get enabled() {
		return this.enabled_;
	}

	public set enabled(v: boolean) {
		this.enabled_ = v;
	}

	public push(name: string) {
		if (!this.enabled) return;
		const id = this.id_;
		this.id_++;
		this.logger_.info(`${this.prefix_}#${id}: Start: ${name}`);
		this.timers_.push({ name, startTime: Date.now(), id });
	}

	public pop() {
		if (!this.enabled) return;
		const t = this.timers_.pop();
		if (!t) throw new Error('Trying to pop a timer but no timer in the list');
		this.logger_.info(`${this.prefix_}#${t.id}: Done: ${t.name}: ${((Date.now() - t.startTime) / 1000).toFixed(2)}s`);
	}

}
