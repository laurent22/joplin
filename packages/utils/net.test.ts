jest.mock('node-fetch');

import fetch from 'node-fetch';
import { fetchWithRetry } from './net';

const mockedFetch = fetch as unknown as jest.Mock;

describe('net', () => {

	beforeEach(() => {
		mockedFetch.mockReset();
	});

	it('should retry a failing request until it succeeds', async () => {
		const response = { ok: true };
		let callCount = 0;
		mockedFetch.mockImplementation(() => {
			callCount++;
			if (callCount < 3) return Promise.reject(new Error(`Failed ${callCount}`));
			return Promise.resolve(response);
		});

		const retries: number[] = [];
		const actual = await fetchWithRetry('http://example.com', {
			retry: 5,
			pause: 1,
			callback: (retry: number) => retries.push(retry),
		});

		expect(callCount).toBe(3);
		expect(retries).toEqual([5, 4]);
		expect(actual).toBe(response);
	});

	it('should throw after the last retry', async () => {
		mockedFetch.mockImplementation(() => Promise.reject(new Error('Always failing')));

		await expect(fetchWithRetry('http://example.com', { retry: 2, pause: 1 }))
			.rejects.toThrow('Always failing');

		expect(mockedFetch).toHaveBeenCalledTimes(2);
	});

});
