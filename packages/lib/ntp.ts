import shim from './shim';
import time from './time';
const ntpClient_ = require('./vendor/ntp-client');

interface NtpServer {
	domain: string;
	port: number;
}

function ntpClient() {
	ntpClient_.dgram = shim.dgram();
	return ntpClient_;
}

const parseNtpServer = (ntpServer: string): NtpServer => {
	const s = ntpServer.split(':');
	if (s.length !== 2) throw new Error('NTP server URL must be in format `domain:port`');
	return {
		domain: s[0],
		port: Number(s[1]),
	};
};

export async function getNetworkTime(ntpServer: string): Promise<Date> {
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	return new Promise((resolve: Function, reject: Function) => {
		const s = parseNtpServer(ntpServer);
		ntpClient().getNetworkTime(s.domain, s.port, (error: any, date: Date) => {
			if (error) {
				reject(error);
				return;
			}

			resolve(date);
		});
	});
}

export async function getDeviceTimeDrift(ntpServer: string): Promise<number> {
	const maxTries = 3;
	let tryCount = 0;

	let ntpTime: Date = null;

	while (true) {
		tryCount++;
		try {
			ntpTime = await getNetworkTime(ntpServer);
			break;
		} catch (error) {
			if (tryCount >= maxTries) {
				const newError = typeof error === 'string' ? new Error(error) : error;
				newError.message = `Cannot retrieve the network time from ${ntpServer}: ${newError.message}`;
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
