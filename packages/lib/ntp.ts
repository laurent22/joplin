import shim from './shim';
import time from './time';
const ntpClient_ = require('./vendor/ntp-client');

const server = {
	domain: 'pool.ntp.org',
	port: 123,
};

function ntpClient() {
	ntpClient_.dgram = shim.dgram();
	return ntpClient_;
}

export async function getNetworkTime(): Promise<Date> {
	return new Promise((resolve: Function, reject: Function) => {
		ntpClient().getNetworkTime(server.domain, server.port, (error: any, date: Date) => {
			if (error) {
				reject(error);
				return;
			}

			resolve(date);
		});
	});
}

export async function getDeviceTimeDrift(): Promise<number> {
	const maxTries = 3;
	let tryCount = 0;

	let ntpTime: Date = null;

	while (true) {
		tryCount++;
		try {
			ntpTime = await getNetworkTime();
			break;
		} catch (error) {
			if (tryCount >= maxTries) {
				const newError = typeof error === 'string' ? new Error(error) : error;
				newError.message = `Cannot retrieve the network time from ${server.domain}:${server.port}: ${newError.message}`;
				throw newError;
			} else {
				await time.msleep(tryCount * 1000);
			}
		}
	}

	return ntpTime.getTime() - Date.now();
}

// export default async function(): Promise<Date> {
// 	if (shouldSyncTime()) {
// 		const release = await fetchingTimeMutex.acquire();

// 		try {
// 			if (shouldSyncTime()) {
// 				const date = await networkTime();
// 				nextSyncTime = Date.now() + 60 * 1000;
// 				timeOffset = date.getTime() - Date.now();
// 			}
// 		} catch (error) {
// 			logger.warn('Could not get NTP time - falling back to device time:', error);
// 			// Fallback to device time since
// 			// most of the time it's actually correct
// 			nextSyncTime = Date.now() + 20 * 1000;
// 			timeOffset = 0;
// 		} finally {
// 			release();
// 		}
// 	}

// 	return new Date(Date.now() + timeOffset);
// }
