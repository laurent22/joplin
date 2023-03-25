/* eslint-disable import/prefer-default-export */

import { sleep } from './time';

export const fetchWithRetry = async (url: string, opts: any = null) => {
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
				await sleep(opts.pause);
			}
		}
	}

	return null;
};
