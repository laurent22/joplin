import dayjs = require('dayjs');
import dayJsUtc = require('dayjs/plugin/utc');
import dayJsDuration = require('dayjs/plugin/duration');
import dayJsTimezone = require('dayjs/plugin/timezone');

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
