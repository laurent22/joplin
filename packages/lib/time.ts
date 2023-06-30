import shim from './shim';
const moment = require('moment');

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

	public unixMsToLocalDateTime(ms: number) {
		return moment.unix(ms / 1000).format('DD/MM/YYYY HH:mm');
	}

	public unixMsToLocalHms(ms: number) {
		return moment.unix(ms / 1000).format('HH:mm:ss');
	}

	public formatMsToLocal(ms: number, format: string = null) {
		if (format === null) format = this.dateTimeFormat();
		return moment(ms).format(format);
	}

	public formatLocalToMs(localDateTime: any, format: string = null) {
		if (format === null) format = this.dateTimeFormat();
		const m = moment(localDateTime, format);
		if (m.isValid()) return m.toDate().getTime();
		throw new Error(`Invalid input for formatLocalToMs: ${localDateTime}`);
	}

	// Mostly used as a utility function for the DateTime Electron component
	public anythingToDateTime(o: any, defaultValue: Date = null) {
		if (o && o.toDate) return o.toDate();
		if (!o) return defaultValue;
		let m = moment(o, time.dateTimeFormat());
		if (m.isValid()) return m.toDate();
		m = moment(o, time.dateFormat());
		return m.isValid() ? m.toDate() : defaultValue;
	}

	public anythingToMs(o: any, defaultValue: number = null) {
		if (o && o.toDate) return o.toDate();
		if (!o) return defaultValue;
		// There are a few date formats supported by Joplin that are not supported by
		// moment without an explicit format specifier. The typical case is that a user
		// has a preferred data format. This means we should try the currently assigned
		// date first, and then attempt to load a generic date string.
		const m = moment(o, this.dateTimeFormat());
		if (m.isValid()) return m.toDate().getTime();
		const d = moment(o);
		return d.isValid() ? d.toDate().getTime() : defaultValue;
	}

	public msleep(ms: number) {
		return new Promise((resolve: Function) => {
			shim.setTimeout(() => {
				resolve();
			}, ms);
		});
	}

	public sleep(seconds: number) {
		return this.msleep(seconds * 1000);
	}


	public goBackInTime(startDate: any, n: number, period: any) {
		// period is a string (eg. "day", "week", "month", "year" ), n is an integer
		return moment(startDate).startOf(period).subtract(n, period).format('x');
	}

	public goForwardInTime(startDate: any, n: number, period: any) {
		return moment(startDate).startOf(period).add(n, period).format('x');
	}

	public async waitTillCondition(condition: ConditionHandler) {
		if (condition()) return;

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
