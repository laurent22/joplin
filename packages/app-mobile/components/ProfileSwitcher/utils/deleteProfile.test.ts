import { CurrentProfileVersion, DefaultProfileId, ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import deleteProfile from './deleteProfile';
import { mkdir } from 'fs/promises';
import { getPluginDataDir, getResourceDir, setDispatch } from '../../../services/profiles';
import { setupDatabase } from '@joplin/lib/testing/test-utils';
import DatabaseDriver, { DatabaseOpenOptions } from '@joplin/lib/database-driver';
import { pathExists } from 'fs-extra';

class MockDatabaseDriver implements DatabaseDriver {
	public async open(_options: DatabaseOpenOptions) {
		throw new Error('Method not implemented: open.');
	}
	public deleteDatabase = jest.fn();
	public selectOne = jest.fn();
	public selectAll = jest.fn();
	public exec = jest.fn();
}

describe('deleteProfile', () => {
	beforeEach(async () => {
		await setupDatabase();
		setDispatch(jest.fn());
	});

	it('should remove a profile', async () => {
		const config: ProfileConfig = {
			version: CurrentProfileVersion,
			currentProfileId: DefaultProfileId,
			profiles: [
				{
					name: 'Testing',
					id: DefaultProfileId,
				},
				{
					name: 'Another test',
					id: 'test',
				},
			],
		};

		const toDelete = config.profiles[1];
		const resourceDir = getResourceDir(toDelete, true);
		await mkdir(resourceDir);
		const pluginDataDir = getPluginDataDir(toDelete, true);
		await mkdir(pluginDataDir);

		const databaseDriver = new MockDatabaseDriver();

		await deleteProfile({
			profileConfig: config,
			toDelete: config.profiles[1],
			databaseDriver,
		});

		expect(databaseDriver.deleteDatabase).toHaveBeenCalled();
		expect(await pathExists(resourceDir)).toBe(false);
		expect(await pathExists(pluginDataDir)).toBe(false);
	});

	it('should refuse to delete the default profile', async () => {
		const config: ProfileConfig = {
			version: CurrentProfileVersion,
			currentProfileId: 'test',
			profiles: [
				{
					name: 'Testing',
					id: DefaultProfileId,
				},
				{
					name: 'Another test',
					id: 'test',
				},
			],
		};

		try {
			await deleteProfile({
				profileConfig: config,
				toDelete: config.profiles[0],
				databaseDriver: new MockDatabaseDriver(),
			});

			expect('did not throw').toBe('threw');
		} catch (error) {
			expect(String(error)).toMatch(/The default profile cannot be deleted/);
		}
	});
});
