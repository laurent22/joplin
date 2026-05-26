// -----------------------------------------------------------------------------------------------
// !!IMPORTANT!! New time-related code should be added to @joplin/util/time and should be based on
// `dayjs` (which is part of `@joplin/util`). Eventually we'll migrate all code here to
// `@joplin/utils/time`.
// -----------------------------------------------------------------------------------------------

import shim from './shim';
import * as moment from 'moment';

type ConditionHandler = ()=> boolean;

class Time {

	private dateFormat_ = 'DD/MM/YYYY';
	private timeFormat_ = 'HH:mm';
	private locale_ = 'en-us';

	public locale() {
		return this.locale_;
	}

	public setLocale(v: string) {
		moment.locale(v);
		this.locale_ = v;
	}

	public dateFormat() {
		return this.dateFormat_;
	}

	public setDateFormat(v: string) {
		this.dateFormat_ = v;
	}

	public timeFormat() {
		return this.timeFormat_;
	}

	public setTimeFormat(v: string) {
		this.timeFormat_ = v;
	}

	public use24HourFormat() {
		return this.timeFormat() ? this.timeFormat().includes('HH') : true;
	}

	public formatDateToLocal(date: Date, format: string = null) {
		return this.formatMsToLocal(date.getTime(), format);
	}

	public dateTimeFormat() {
		return `${this.dateFormat()} ${this.timeFormat()}`;
	}

	public unix() {
		return Math.floor(Date.now() / 1000);
	}

	public unixMs() {
		return Date.now();
	}

	public unixMsToObject(ms: number) {
		return new Date(ms);
	}

	public unixMsToS(ms: number) {
		return Math.floor(ms / 1000);
	}

	public unixMsToIso(ms: number) {
		return (
			`${moment
				.unix(ms / 1000)
				.utc()
				.format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`
		);
	}

	public unixMsToIsoSec(ms: number) {
		return (
			`${moment
				.unix(ms / 1000)
				.utc()
				.format('YYYY-MM-DDTHH:mm:ss')}Z`
		);
	}

	public unixMsToRfc3339Sec(ms: number) {
		return (
			`${moment
				.unix(ms / 1000)
				.utc()
				.format('YYYY-MM-DD HH:mm:ss')}Z`
		);
	}

	public rfc3339SecToUnixMs(rfc3339: string): number {
		const m = moment.utc(rfc3339, 'YYYY-MM-DD HH:mm:ss[Z]', true);
		if (!m.isValid()) {
			throw new Error(`Invalid RFC3339 date format: ${rfc3339}`);
		}
		return m.valueOf();
	}

	public unixMsToLocalDateTime(ms: number): string {
		return moment.unix(ms / 1000).format('DD/MM/YYYY HH:mm');
	}

	public unixMsToLocalHms(ms: number) {
		return moment.unix(ms / 1000).format('HH:mm:ss');
	}

	public formatMsToLocal(ms: number, format: string = null) {
		if (format === null) format = this.dateTimeFormat();
		return moment(ms).format(format) as string;
	}

	public formatLocalToMs(localDateTime: string | number | Date, format: string = null) {
		if (format === null) format = this.dateTimeFormat();
		const m = moment(localDateTime, format);
		if (m.isValid()) return m.toDate().getTime();
		throw new Error(`Invalid input for formatLocalToMs: ${localDateTime}`);
	}

	// Mostly used as a utility function for the DateTime Electron component
	public anythingToDateTime(o: string | number | Date | { toDate(): Date } | null, defaultValue: Date = null) {
		if (o && typeof o === 'object' && 'toDate' in o) return o.toDate();
		if (!o) return defaultValue;
		const input = o as string | number | Date;
		let m = moment(input, time.dateTimeFormat());
		if (m.isValid()) return m.toDate();
		m = moment(input, time.dateFormat());
		return m.isValid() ? m.toDate() : defaultValue;
	}

	public anythingToMs(o: string | number | Date | { toDate(): Date } | null, defaultValue: number = null) {
		if (o && typeof o === 'object' && 'toDate' in o) return o.toDate();
		if (!o) return defaultValue;
		// There are a few date formats supported by Joplin that are not supported by
		// moment without an explicit format specifier. The typical case is that a user
		// has a preferred data format. This means we should try the currently assigned
		// date first, and then attempt to load a generic date string.
		const input = o as string | number | Date;
		const m = moment(input, this.dateTimeFormat());
		if (m.isValid()) return m.toDate().getTime();
		const d = moment(input);
		return d.isValid() ? d.toDate().getTime() : defaultValue;
	}

	public msleep(ms: number) {
		return new Promise<void>(resolve => {
			shim.setTimeout(() => {
				resolve();
			}, ms);
		});
	}

	public sleep(seconds: number) {
		return this.msleep(seconds * 1000);
	}


	public goBackInTime(startDate: string | number | Date, n: number, period: string) {
		// period is a string (eg. "day", "week", "month", "year" ), n is an integer
		return moment(startDate).startOf(period as moment.unitOfTime.StartOf).subtract(n, period as moment.unitOfTime.DurationConstructor).format('x');
	}

	public goForwardInTime(startDate: string | number | Date, n: number, period: string) {
		return moment(startDate).startOf(period as moment.unitOfTime.StartOf).add(n, period as moment.unitOfTime.DurationConstructor).format('x');
	}

	public async waitTillCondition(condition: ConditionHandler) {
		if (condition()) return null;

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

export default time;
