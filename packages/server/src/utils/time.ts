import dayjs = require('dayjs');

export function msleep(ms: number) {
	return new Promise((resolve: Function) => {
		setTimeout(() => {
			resolve(null);
		}, ms);
	});
}

export function formatDateTime(ms: number): string {
	return dayjs(ms).format('D MMM YY HH:mm:ss');
}



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
	console.info(`Time: ${t.name}: ${Date.now() - t.startTime}`);
}
