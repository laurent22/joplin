"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timerPop = exports.timerPush = exports.isIso8601Duration = exports.durationToMilliseconds = exports.formatDateTime = exports.msleep = exports.Month = exports.Week = exports.Day = exports.Hour = exports.Minute = exports.Second = void 0;
const dayjs = require("dayjs");
const dayJsUtc = require("dayjs/plugin/utc");
const dayJsDuration = require("dayjs/plugin/duration");
const dayJsTimezone = require("dayjs/plugin/timezone");
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
exports.Second = 1000;
exports.Minute = 60 * exports.Second;
exports.Hour = 60 * exports.Minute;
exports.Day = 24 * exports.Hour;
exports.Week = 7 * exports.Day;
exports.Month = 30 * exports.Day;
function msleep(ms) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(null);
        }, ms);
    });
}
exports.msleep = msleep;
function formatDateTime(ms) {
    if (!ms)
        return '-';
    ms = ms instanceof Date ? ms.getTime() : ms;
    return `${dayjs(ms).format('D MMM YY HH:mm:ss')} (${defaultTimezone()})`;
}
exports.formatDateTime = formatDateTime;
const durationToMilliseconds = (durationIso8601) => {
    const d = dayjs.duration(durationIso8601).asMilliseconds();
    if (isNaN(d))
        throw new Error(`Invalid ISO 8601 duration: ${durationIso8601}`);
    return d;
};
exports.durationToMilliseconds = durationToMilliseconds;
const isIso8601Duration = (s) => {
    return s.startsWith('P');
};
exports.isIso8601Duration = isIso8601Duration;
const perfTimers_ = [];
function timerPush(name) {
    perfTimers_.push({ name, startTime: Date.now() });
}
exports.timerPush = timerPush;
function timerPop() {
    const t = perfTimers_.pop();
    // eslint-disable-next-line no-console
    console.info(`Time: ${t.name}: ${Date.now() - t.startTime}`);
}
exports.timerPop = timerPop;
//# sourceMappingURL=time.js.map