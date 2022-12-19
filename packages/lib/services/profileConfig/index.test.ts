import { writeFile } from 'fs-extra';
import { createNewProfile, getProfileFullPath, loadProfileConfig, migrateProfileConfig, saveProfileConfig } from '.';
import { tempFilePath } from '../../testing/test-utils';
import { CurrentProfileVersion, defaultProfile, defaultProfileConfig, DefaultProfileId, Profile, ProfileConfig } from './types';

describe('profileConfig/index', () => {

	it('should load a default profile config', async () => {
		const filePath = tempFilePath('json');
		const config = await loadProfileConfig(filePath);
		expect(config).toEqual(defaultProfileConfig());
	});

	it('should load a profile config', async () => {
		const filePath = tempFilePath('json');
		const config = {
			profiles: [
				{
					name: 'Testing',
					id: DefaultProfileId,
				},
			],
		};
		await writeFile(filePath, JSON.stringify(config), 'utf8');

		const loadedConfig = await loadProfileConfig(filePath);

		const expected: ProfileConfig = {
			version: CurrentProfileVersion,
			currentProfileId: DefaultProfileId,
			profiles: [
				{
					name: 'Testing',
					id: DefaultProfileId,
				},
			],
		};

		expect(loadedConfig).toEqual(expected);
	});


	it('should load a save a config', async () => {
		const filePath = tempFilePath('json');
		const config = defaultProfileConfig();
		await saveProfileConfig(filePath, config);

		const loadedConfig = await loadProfileConfig(filePath);
		expect(config).toEqual(loadedConfig);
	});

	it('should get a profile full path', async () => {
		const profile1: Profile = {
			...defaultProfile(),
			id: 'abcd',
		};

		const profile2: Profile = {
			...defaultProfile(),
			id: DefaultProfileId,
		};

		expect(getProfileFullPath(profile1, '/test/root')).toBe('/test/root/profile-abcd');
		expect(getProfileFullPath(profile2, '/test/root')).toBe('/test/root');
	});

	it('should create a new profile', async () => {
		let config = defaultProfileConfig();
		const r1 = createNewProfile(config, 'new profile 1');
		const r2 = createNewProfile(r1.newConfig, 'new profile 2');
		config = r2.newConfig;

		expect(config.profiles.length).toBe(3);
		expect(config.profiles[1].name).toBe('new profile 1');
		expect(config.profiles[2].name).toBe('new profile 2');

		expect(config.profiles[1].id).not.toBe(config.profiles[2].id);
	});

	it('should migrate profile config - version 1 to 2', async () => {
		const migrated1 = migrateProfileConfig({
			'version': 1,
			'currentProfile': 2,
			'profiles': [
				{
					'name': 'Default',
					'path': '.',
				},
				{
					'name': 'sub1',
					'path': 'profile-sjn25kuh',
				},
				{
					'name': 'sub2',
					'path': 'profile-yufzkns3',
				},
			],
		}, 2);

		expect(migrated1).toEqual({
			'version': 2,
			'currentProfileId': 'yufzkns3',
			'profiles': [
				{
					'name': 'Default',
					'id': 'default',
				},
				{
					'name': 'sub1',
					'id': 'sjn25kuh',
				},
				{
					'name': 'sub2',
					'id': 'yufzkns3',
				},
			],
		});
	});

});
