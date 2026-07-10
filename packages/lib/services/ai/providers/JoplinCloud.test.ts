import { Second } from '@joplin/utils/time';
import { mockFetch, runWithFakeTimers, setupDatabaseAndSynchronizer, switchClient } from '../../../testing/test-utils';
import JoplinCloudProvider from './JoplinCloud';
import Setting from '../../../models/Setting';

const mockRateLimitedChatApi = () => {
	let counter = 0;
	const mock = mockFetch((request) => {
		if (request.url.endsWith('ai/chat/completions')) {
			counter ++;
			if (counter < 2) {
				return new Response('{}', {
					status: 429,
					headers: [
						['Retry-After', '3'],
					],
				});
			} else {
				return new Response('{ "choices": [] }', {
					status: 200,
				});
			}
		}
		return new Response('{ }', {
			status: 200,
		});
	});

	return { mock, requestCount: () => counter };
};

describe('ai/providers/JoplinCloud', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		Setting.setValue('sync.target', 10);
	});

	it('should retry rate-limited requests', async () => {
		const { mock, requestCount } = mockRateLimitedChatApi();
		try {
			await runWithFakeTimers(async () => {
				const provider = new JoplinCloudProvider();
				const result = provider.chat([]);
				await jest.advanceTimersByTimeAsync(Second * 5);
				await result;

				// Should have retried
				expect(requestCount()).toBe(2);
			});
		} finally {
			mock.reset();
		}
	});
});
