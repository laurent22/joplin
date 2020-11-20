import shim from './shim';
const moment = require('moment');

class Time {

	private dateFormat_: string = 'DD/MM/YYYY';
	private timeFormat_: string = 'HH:mm';
	private locale_: string = 'en-us';

	locale() {
		return this.locale_;
	}

	setLocale(v: string) {
		moment.locale(v);
		this.locale_ = v;
	}

	dateFormat() {
		return this.dateFormat_;
	}

	setDateFormat(v: string) {
		this.dateFormat_ = v;
	}

	timeFormat() {
		return this.timeFormat_;
	}

	setTimeFormat(v: string) {
		this.timeFormat_ = v;
	}

	use24HourFormat() {
		return this.timeFormat() ? this.timeFormat().includes('HH') : true;
	}

	formatDateToLocal(date: Date, format: string = null) {
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

	unixMsToObject(ms: number) {
		return new Date(ms);
	}

	unixMsToS(ms: number) {
		return Math.floor(ms / 1000);
	}

	unixMsToIso(ms: number) {
		return (
			`${moment
				.unix(ms / 1000)
				.utc()
				.format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`
		);
	}

	unixMsToIsoSec(ms: number) {
		return (
			`${moment
				.unix(ms / 1000)
				.utc()
				.format('YYYY-MM-DDTHH:mm:ss')}Z`
		);
	}

	unixMsToLocalDateTime(ms: number) {
		return moment.unix(ms / 1000).format('DD/MM/YYYY HH:mm');
	}

	unixMsToLocalHms(ms: number) {
		return moment.unix(ms / 1000).format('HH:mm:ss');
	}

	formatMsToLocal(ms: number, format: string = null) {
		if (format === null) format = this.dateTimeFormat();
		return moment(ms).format(format);
	}

	formatLocalToMs(localDateTime: any, format: string = null) {
		if (format === null) format = this.dateTimeFormat();
		const m = moment(localDateTime, format);
		if (m.isValid()) return m.toDate().getTime();
		throw new Error(`Invalid input for formatLocalToMs: ${localDateTime}`);
	}

	// Mostly used as a utility function for the DateTime Electron component
	anythingToDateTime(o: any, defaultValue: Date = null) {
		if (o && o.toDate) return o.toDate();
		if (!o) return defaultValue;
		let m = moment(o, time.dateTimeFormat());
		if (m.isValid()) return m.toDate();
		m = moment(o, time.dateFormat());
		return m.isValid() ? m.toDate() : defaultValue;
	}

	msleep(ms: number) {
		return new Promise((resolve) => {
			shim.setTimeout(() => {
				resolve();
			}, ms);
		});
	}

	sleep(seconds: number) {
		return this.msleep(seconds * 1000);
	}


	goBackInTime(startDate: any, n: number, period: any) {
		// period is a string (eg. "day", "week", "month", "year" ), n is an integer
		return moment(startDate).startOf(period).subtract(n, period).format('x');
	}

	goForwardInTime(startDate: any, n: number, period: any) {
		return moment(startDate).startOf(period).add(n, period).format('x');
	}

}

const time = new Time();

export default time;
