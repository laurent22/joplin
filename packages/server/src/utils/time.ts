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
