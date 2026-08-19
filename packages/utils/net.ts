/* eslint-disable import/prefer-default-export */

import { msleep } from './time';
import fetch, { RequestInit } from 'node-fetch';

interface FetchWithRetryOptions extends RequestInit {
	retry?: number;
	callback?: (retry: number)=> void;
	pause?: number;
}

export const fetchWithRetry = async (url: string, opts: FetchWithRetryOptions | null = null) => {
	if (!opts) opts = {};
	let retry = opts && opts.retry || 3;

	while (retry > 0) {
		try {
			return fetch(url, opts);
		} catch (e) {
			if (opts && opts.callback) {
				opts.callback(retry);
			}
			retry = retry - 1;
			if (retry === 0) {
				throw e;
			}

			if (opts && opts.pause) {
				await msleep(opts.pause);
			}
		}
	}

	return null;
};
