import { writeFile } from 'fs-extra';
import { createNewProfile, getProfileFullPath, loadProfileConfig, saveProfileConfig } from '.';
import { tempFilePath } from '../../testing/test-utils';
import { defaultProfile, defaultProfileConfig, ProfileConfig } from './types';

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
					path: '.',
				},
			],
		};
		await writeFile(filePath, JSON.stringify(config), 'utf8');

		const loadedConfig = await loadProfileConfig(filePath);

		const expected: ProfileConfig = {
			version: 1,
			currentProfile: 0,
			profiles: [
				{
					name: 'Testing',
					path: '.',
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
		const profile1 = {
			...defaultProfile(),
			path: 'profile-abcd',
		};

		const profile2 = {
			...defaultProfile(),
			path: '.',
		};

		const profile3 = {
			...defaultProfile(),
			path: 'profiles/pro/',
		};

		expect(getProfileFullPath(profile1, '/test/root')).toBe('/test/root/profile-abcd');
		expect(getProfileFullPath(profile2, '/test/root')).toBe('/test/root');
		expect(getProfileFullPath(profile3, '/test/root')).toBe('/test/root/profiles/pro');
	});

	it('should create a new profile', async () => {
		let config = defaultProfileConfig();
		config = createNewProfile(config, 'new profile 1');
		config = createNewProfile(config, 'new profile 2');

		expect(config.profiles.length).toBe(3);
		expect(config.profiles[1].name).toBe('new profile 1');
		expect(config.profiles[2].name).toBe('new profile 2');

		expect(config.profiles[1].path).not.toBe(config.profiles[2].path);
	});

});
