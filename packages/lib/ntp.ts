import shim from './shim';
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
	return new Promise(function(resolve: Function, reject: Function) {
		ntpClient().getNetworkTime(server.domain, server.port, function(error: any, date: Date) {
			if (error) {
				reject(error);
				return;
			}

			resolve(date);
		});
	});
}

export async function getDeviceTimeDrift(): Promise<number> {
	let ntpTime: Date = null;
	try {
		ntpTime = await getNetworkTime();
	} catch (error) {
		error.message = `Cannot retrieve the network time: ${error.message}`;
		throw error;
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
