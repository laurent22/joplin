/* eslint-disable import/prefer-default-export */

// Provides metrics about the operating system and server application, and format them in a message
// that can be printed to log.

import { MemUsedInfo, cpu, mem } from 'node-os-utils';
import { Minute } from './time';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('metrics');

let requestsPerSecond_: Record<number, number> = {};
let activeRequests_: Record<string, boolean> = {};

const requestsPerMinute = () => {
	const nowSeconds = Math.floor(Date.now() / 1000);
	const startSeconds = nowSeconds - 60;

	let total = 0;
	for (let i = startSeconds; i < nowSeconds; i++) {
		if (!(i in requestsPerSecond_)) continue;
		total += requestsPerSecond_[i];
	}

	return total;
};

const deleteRequestInfoOlderThan = (ttl: number) => {
	const cutOffTime = Math.round((Date.now() - ttl) / 1000);
	for (const key of (Object.keys(requestsPerSecond_))) {
		if (Number(key) < cutOffTime) delete requestsPerSecond_[Number(key)];
	}
};

const countRequest = () => {
	const t = Math.floor(Date.now() / 1000);
	if (!requestsPerSecond_[t]) requestsPerSecond_[t] = 0;
	requestsPerSecond_[t]++;

	deleteRequestInfoOlderThan(10 * Minute);
};

export const clearMetrics = () => {
	requestsPerSecond_ = {};
	activeRequests_ = {};
};

export const heartbeatMessage = async () => {
	const interval = 1000;

	const promises: Promise<void>[] = [];

	interface Info {
		cpu?: number;
		memory?: MemUsedInfo;
	}

	const info: Info = {};

	const getCpu = async () => {
		info.cpu = await cpu.usage(interval);
	};

	const getMemory = async () => {
		info.memory = await mem.used();
	};

	promises.push(getCpu());
	promises.push(getMemory());

	await Promise.all(promises);

	const line: string[] = [];

	line.push(`Cpu: ${info.cpu}%`);
	line.push(`Mem: ${info.memory.usedMemMb} / ${info.memory.totalMemMb} MB (${Math.round((info.memory.usedMemMb / info.memory.totalMemMb) * 100)}%)`);
	line.push(`Req: ${requestsPerMinute()} / min`);
	line.push(`Active req: ${Object.keys(activeRequests_).length}`);

	return line.join('; ');
};

export const logHeartbeat = async () => {
	logger.info(await heartbeatMessage());
};

export const onRequestStart = (requestId: string) => {
	countRequest();
	activeRequests_[requestId] = true;
};

export const onRequestComplete = (requestId: string) => {
	delete activeRequests_[requestId];
};
