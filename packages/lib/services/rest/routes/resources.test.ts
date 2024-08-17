import { setupDatabaseAndSynchronizer, switchClient } from '../../../testing/test-utils';
import Api, { RequestMethod } from '../Api';

let api: Api = null;

describe('routes/resources', () => {

	beforeEach(async () => {
		api = new Api();
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should not be possible to update mime via PUT', async () => {
		const originalResource = await api.route(
			RequestMethod.POST,
			'resources',
			null,
			null,
			[{ path: './images/SideMenuHeader.png' }],
		);
		const resourceModified = await api.route(
			RequestMethod.PUT,
			`resources/${originalResource.id}`,
			null,
			JSON.stringify({ mime: 'test' }),
		);

		expect(resourceModified.mime).not.toBe('test');
		expect(resourceModified.mime).toBe(originalResource.mime);
	});
});
