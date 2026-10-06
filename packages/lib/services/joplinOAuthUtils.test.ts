import Setting from '../models/Setting';
import SyncTargetRegistry from '../SyncTargetRegistry';
import { mockFetch, setupDatabase, switchClient, withWarningSilenced } from '../testing/test-utils';
import { completePendingAuthentication, fetchLoginUrl } from './joplinOAuthUtils';

describe('joplinOAuthUtils', () => {
	beforeEach(async () => {
		await setupDatabase(0);
		await switchClient(0);
	});

	it('should refuse to complete pending authentication if the server URL has changed', async () => {
		const syncTargetId = SyncTargetRegistry.nameToId('joplinServer');
		Setting.setValue('sync.target', syncTargetId);
		Setting.setValue(`sync.${syncTargetId}.path`, 'http://localhost:1234/');
		Setting.setValue(`sync.${syncTargetId}.pendingAuthData`, {
			path: 'http://localhost:1235/',
			appId: 'some-id-here',
		});

		await withWarningSilenced(/Could not complete pending authentication:.*: Server URL changed since last/, async () => {
			await completePendingAuthentication();
		}, { requireWarning: true });

		expect(Setting.value(`sync.${syncTargetId}.pendingAuthData`)).toEqual({});
	});

	it.each([
		{
			label: 'should not try to fetch for Joplin Cloud',
			syncTarget: 'joplinCloud',
			onFetch: (_request: Request) => {
				throw new Error('Should not fetch');
			},
			expected: (syncTargetId: number) => (
				Setting.value(`sync.${syncTargetId}.website`)
			),
		},
		{
			label: 'should return null when the web_login_base_url route returns 404',
			syncTarget: 'joplinServer',
			onFetch: (_request: Request) => {
				return new Response('', { status: 404 });
			},
			expected: (): string|null => null,
		},
		{
			label: 'should return the normalized URI from the web_login_base_url route',
			syncTarget: 'joplinServer',
			onFetch: (request: Request) => {
				if (!request.url.endsWith('/api/web_login_base_url')) {
					throw new Error(`Unexpected request to ${request.url}`);
				}
				return new Response('{ "uri": "http://example.com/" }');
			},
			// Should normalize the URL (remove trailing slashes)
			expected: () => 'http://example.com',
		},
	])('fetchLoginUrl $label', async ({ syncTarget, onFetch, expected }) => {
		const syncTargetId = SyncTargetRegistry.nameToId(syncTarget);
		Setting.setValue('sync.target', syncTargetId);
		if (syncTarget === 'joplinServer') {
			Setting.setValue(`sync.${syncTargetId}.path`, 'http://localhost:22300/');
		}

		const { reset } = mockFetch((request) => {
			return onFetch(request);
		});
		try {
			const url = await fetchLoginUrl(syncTargetId, Setting.value(`sync.${syncTargetId}.path`));
			expect(url).toBe(expected(syncTargetId));
		} finally {
			reset();
		}
	});
});
