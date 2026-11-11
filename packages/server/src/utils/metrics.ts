/* eslint-disable import/prefer-default-export */

// Provides metrics about the operating system and server application, and format them in a message
// that can be printed to log.

import * as os from 'os';
import { Minute } from './time';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('metrics');

type TimestampToRequestCount = Map<number, number>;
// Items must be added in increasing order of timestamp.
const requestsPerSecond_: TimestampToRequestCount = new Map();

const activeRequests_ = new Set<string>();

const requestsPerMinute = () => {
	const nowSeconds = Math.floor(Date.now() / 1000);
	const startSeconds = nowSeconds - 60;

	let total = 0;
	for (let i = startSeconds; i < nowSeconds; i++) {
		if (!requestsPerSecond_.has(i)) continue;
		total += requestsPerSecond_.get(i);
	}

	return total;
};

const deleteRequestInfoOlderThan = (ttl: number) => {
	const cutOffTime = Math.round((Date.now() - ttl) / 1000);
	for (const key of requestsPerSecond_.keys()) {
		if (key >= cutOffTime) {
			// Map iteration happens in insertion order. All subsequent items will be after the cutOffTime.
			// See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map.
			break;
		}
		requestsPerSecond_.delete(key);
	}
};

const countRequest = () => {
	const t = Math.floor(Date.now() / 1000);
	if (!requestsPerSecond_.has(t)) requestsPerSecond_.set(t, 0);
	requestsPerSecond_.set(t, (requestsPerSecond_.get(t) ?? 0) + 1);

	deleteRequestInfoOlderThan(10 * Minute);
};

export const clearMetrics = () => {
	requestsPerSecond_.clear();
	activeRequests_.clear();
};

export const heartbeatMessage = () => {
	const loadAvg = os.loadavg();
	const totalMemMb = Math.round(os.totalmem() / (1024 * 1024));
	const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
	const usedMemMb = totalMemMb - freeMemMb;

	const line: string[] = [];

	const cpuCount = os.cpus().length;
	const cpuPercent = Math.round((loadAvg[0] / cpuCount) * 100);
	line.push(`Cpu: ${cpuPercent}%`);
	line.push(`Mem: ${usedMemMb} / ${totalMemMb} MB (${Math.round((usedMemMb / totalMemMb) * 100)}%)`);
	line.push(`Req: ${requestsPerMinute()} / min`);
	line.push(`Active req: ${activeRequests_.size}`);

	return line.join('; ');
};

export const logHeartbeat = () => {
	logger.info(heartbeatMessage());
};

export const onRequestStart = (requestId: string) => {
	countRequest();
	activeRequests_.add(requestId);
};

export const onRequestComplete = (requestId: string) => {
	activeRequests_.delete(requestId);
};
