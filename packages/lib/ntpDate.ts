const ntpClient = require('./vendor/ntp-client');
const Logger = require('./Logger').default;
const Mutex = require('async-mutex').Mutex;

let nextSyncTime = 0;
let timeOffset = 0;
let logger = new Logger();

const fetchingTimeMutex = new Mutex();

const server = {
	domain: 'pool.ntp.org',
	port: 123,
};

async function networkTime(): Promise<Date> {
	return new Promise(function(resolve: Function, reject: Function) {
		ntpClient.getNetworkTime(server.domain, server.port, function(error: any, date: Date) {
			if (error) {
				reject(error);
				return;
			}

			resolve(date);
		});
	});
}

function shouldSyncTime() {
	return !nextSyncTime || Date.now() > nextSyncTime;
}

export function setLogger(v: any) {
	logger = v;
}

export default async function(): Promise<Date> {
	if (shouldSyncTime()) {
		const release = await fetchingTimeMutex.acquire();

		try {
			if (shouldSyncTime()) {
				const date = await networkTime();
				nextSyncTime = Date.now() + 60 * 1000;
				timeOffset = date.getTime() - Date.now();
			}
		} catch (error) {
			logger.warn('Could not get NTP time - falling back to device time:', error);
			// Fallback to device time since
			// most of the time it's actually correct
			nextSyncTime = Date.now() + 20 * 1000;
			timeOffset = 0;
		} finally {
			release();
		}
	}

	return new Date(Date.now() + timeOffset);
}
