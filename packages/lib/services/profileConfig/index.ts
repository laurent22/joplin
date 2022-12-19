import { rtrimSlashes } from '../../path-utils';
import shim from '../../shim';
import { CurrentProfileVersion, defaultProfile, defaultProfileConfig, DefaultProfileId, Profile, ProfileConfig } from './types';
import { customAlphabet } from 'nanoid/non-secure';

export const migrateProfileConfig = (profileConfig: any, toVersion: number): ProfileConfig => {
	let version = 2;

	while (profileConfig.version < toVersion) {
		if (profileConfig.version === 1) {
			for (const profile of profileConfig.profiles) {
				if (profile.path === '.') {
					profile.id = DefaultProfileId;
				} else {
					profile.id = profile.path.split('-').pop();
				}
				delete profile.path;
			}

			const currentProfile = profileConfig.profiles[profileConfig.currentProfile];
			profileConfig.currentProfileId = currentProfile.id;
			delete profileConfig.currentProfile;
		}

		profileConfig.version = version;
		version++;
	}

	return profileConfig;
};

export const loadProfileConfig = async (profileConfigPath: string): Promise<ProfileConfig> => {
	if (!(await shim.fsDriver().exists(profileConfigPath))) {
		return defaultProfileConfig();
	}

	try {
		const configContent = await shim.fsDriver().readFile(profileConfigPath, 'utf8');
		let parsed = JSON.parse(configContent) as ProfileConfig;
		if (!parsed.profiles || !parsed.profiles.length) throw new Error(`Profile config should contain at least one profile: ${profileConfigPath}`);

		parsed = migrateProfileConfig(parsed, CurrentProfileVersion);

		const output: ProfileConfig = {
			...defaultProfileConfig(),
			...parsed,
		};

		for (let i = 0; i < output.profiles.length; i++) {
			output.profiles[i] = {
				...defaultProfile(),
				...output.profiles[i],
			};
		}

		if (!output.profiles.find(p => p.id === output.currentProfileId)) throw new Error(`Current profile ID is invalid: ${output.currentProfileId}`);
		return output;
	} catch (error) {
		error.message = `Could not parse profile configuration: ${profileConfigPath}: ${error.message}`;
		throw error;
	}
};

export const saveProfileConfig = async (profileConfigPath: string, config: ProfileConfig) => {
	await shim.fsDriver().writeFile(profileConfigPath, JSON.stringify(config, null, '\t'), 'utf8');
};

export const getCurrentProfile = (config: ProfileConfig): Profile => {
	return config.profiles.find(p => p.id === config.currentProfileId);
};

export const getProfileFullPath = (profile: Profile, rootProfilePath: string): string => {
	const folderName = profile.id === DefaultProfileId ? '' : `/profile-${profile.id}`;
	return `${rtrimSlashes(rootProfilePath)}${folderName}`;
};

export const isSubProfile = (profile: Profile): boolean => {
	return profile.id !== DefaultProfileId;
};

const profileIdGenerator = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

export const createNewProfile = (config: ProfileConfig, profileName: string) => {
	const newConfig: ProfileConfig = {
		...config,
		profiles: config.profiles.slice(),
	};

	const newProfile: Profile = {
		name: profileName,
		id: profileIdGenerator(),
	};

	newConfig.profiles.push(newProfile);

	return {
		newConfig: newConfig,
		newProfile: newProfile,
	};
};

export const profileIdByIndex = (config: ProfileConfig, index: number): string => {
	return config.profiles[index].id;
};
