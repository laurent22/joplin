"use strict";
// -----------------------------------------------------------------------------------------------
// !!IMPORTANT!! New time-related code should be added to @joplin/util/time and should be based on
// `dayjs` (which is part of `@joplin/util`). Eventually we'll migrate all code here to
// `@joplin/utils/time`.
// -----------------------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
const shim_1 = require("./shim");
const moment = require('moment');
class Time {
    constructor() {
        this.dateFormat_ = 'DD/MM/YYYY';
        this.timeFormat_ = 'HH:mm';
        this.locale_ = 'en-us';
    }
    locale() {
        return this.locale_;
    }
    setLocale(v) {
        moment.locale(v);
        this.locale_ = v;
    }
    dateFormat() {
        return this.dateFormat_;
    }
    setDateFormat(v) {
        this.dateFormat_ = v;
    }
    timeFormat() {
        return this.timeFormat_;
    }
    setTimeFormat(v) {
        this.timeFormat_ = v;
    }
    use24HourFormat() {
        return this.timeFormat() ? this.timeFormat().includes('HH') : true;
    }
    formatDateToLocal(date, format = null) {
        return this.formatMsToLocal(date.getTime(), format);
    }
    dateTimeFormat() {
        return `${this.dateFormat()} ${this.timeFormat()}`;
    }
    unix() {
        return Math.floor(Date.now() / 1000);
    }
    unixMs() {
        return Date.now();
    }
    unixMsToObject(ms) {
        return new Date(ms);
    }
    unixMsToS(ms) {
        return Math.floor(ms / 1000);
    }
    unixMsToIso(ms) {
        return (`${moment
            .unix(ms / 1000)
            .utc()
            .format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`);
    }
    unixMsToIsoSec(ms) {
        return (`${moment
            .unix(ms / 1000)
            .utc()
            .format('YYYY-MM-DDTHH:mm:ss')}Z`);
    }
    unixMsToRfc3339Sec(ms) {
        return (`${moment
            .unix(ms / 1000)
            .utc()
            .format('YYYY-MM-DD HH:mm:ss')}Z`);
    }
    unixMsToLocalDateTime(ms) {
        return moment.unix(ms / 1000).format('DD/MM/YYYY HH:mm');
    }
    unixMsToLocalHms(ms) {
        return moment.unix(ms / 1000).format('HH:mm:ss');
    }
    formatMsToLocal(ms, format = null) {
        if (format === null)
            format = this.dateTimeFormat();
        return moment(ms).format(format);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    formatLocalToMs(localDateTime, format = null) {
        if (format === null)
            format = this.dateTimeFormat();
        const m = moment(localDateTime, format);
        if (m.isValid())
            return m.toDate().getTime();
        throw new Error(`Invalid input for formatLocalToMs: ${localDateTime}`);
    }
    // Mostly used as a utility function for the DateTime Electron component
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    anythingToDateTime(o, defaultValue = null) {
        if (o && o.toDate)
            return o.toDate();
        if (!o)
            return defaultValue;
        let m = moment(o, time.dateTimeFormat());
        if (m.isValid())
            return m.toDate();
        m = moment(o, time.dateFormat());
        return m.isValid() ? m.toDate() : defaultValue;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    anythingToMs(o, defaultValue = null) {
        if (o && o.toDate)
            return o.toDate();
        if (!o)
            return defaultValue;
        // There are a few date formats supported by Joplin that are not supported by
        // moment without an explicit format specifier. The typical case is that a user
        // has a preferred data format. This means we should try the currently assigned
        // date first, and then attempt to load a generic date string.
        const m = moment(o, this.dateTimeFormat());
        if (m.isValid())
            return m.toDate().getTime();
        const d = moment(o);
        return d.isValid() ? d.toDate().getTime() : defaultValue;
    }
    msleep(ms) {
        // eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
        return new Promise((resolve) => {
            shim_1.default.setTimeout(() => {
                resolve();
            }, ms);
        });
    }
    sleep(seconds) {
        return this.msleep(seconds * 1000);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    goBackInTime(startDate, n, period) {
        // period is a string (eg. "day", "week", "month", "year" ), n is an integer
        return moment(startDate).startOf(period).subtract(n, period).format('x');
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    goForwardInTime(startDate, n, period) {
        return moment(startDate).startOf(period).add(n, period).format('x');
    }
    async waitTillCondition(condition) {
        if (condition())
            return null;
        return new Promise(resolve => {
            const iid = setInterval(() => {
                if (condition()) {
                    clearInterval(iid);
                    resolve(null);
                }
            }, 1000);
        });
    }
}
const time = new Time();
exports.default = time;
