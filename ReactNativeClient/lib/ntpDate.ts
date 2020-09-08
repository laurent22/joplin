const ntpClient = require('lib/vendor/ntp-client');
const Mutex = require('async-mutex').Mutex;

let lastSyncTime = 0;
let timeOffset = 0;
const fetchingTimeMutex = new Mutex();

const server = {
	domain: 'pool.ntp.org',
	port: 123,
};

async function networkTime():Promise<Date> {
	return new Promise(function(resolve:Function, reject:Function) {
		ntpClient.getNetworkTime(server.domain, server.port, function(error:any, date:Date) {
			if (error) {
				reject(error);
				return;
			}

			resolve(date);
		});
	});
}

function shouldSyncTime() {
	return !lastSyncTime || Date.now() - lastSyncTime >= 5 * 1000;
}

export default async function():Promise<Date> {
	if (shouldSyncTime()) {
		const release = await fetchingTimeMutex.acquire();

		try {
			if (shouldSyncTime()) {
				const date = await networkTime();
				lastSyncTime = Date.now();
				timeOffset = date.getTime() - Date.now();
			}
		} finally {
			release();
		}
	}

	return new Date(Date.now() + timeOffset);
}
