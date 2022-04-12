import { rtrimSlashes, trimSlashes } from '../../path-utils';
import shim from '../../shim';
import { defaultProfile, defaultProfileConfig, Profile, ProfileConfig } from './types';
import { customAlphabet } from 'nanoid/non-secure';

export const loadProfileConfig = async (profileConfigPath: string): Promise<ProfileConfig> => {
	if (!(await shim.fsDriver().exists(profileConfigPath))) {
		return defaultProfileConfig();
	}

	try {
		const configContent = await shim.fsDriver().readFile(profileConfigPath, 'utf8');
		const parsed = JSON.parse(configContent) as ProfileConfig;
		if (!parsed.profiles || !parsed.profiles.length) throw new Error(`Profile config should contain at least one profile: ${profileConfigPath}`);

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

		if (output.currentProfile < 0 || output.currentProfile >= output.profiles.length) throw new Error(`Profile index out of range: ${output.currentProfile}`);
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
	return { ...config.profiles[config.currentProfile] };
};

export const getProfileFullPath = (profile: Profile, rootProfilePath: string): string => {
	let p = trimSlashes(profile.path);
	if (p === '.') p = '';
	return rtrimSlashes(`${rtrimSlashes(rootProfilePath)}/${p}`);
};

const profileIdGenerator = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

export const createNewProfile = (config: ProfileConfig, profileName: string) => {
	const newConfig = {
		...config,
		profiles: config.profiles.slice(),
	};

	newConfig.profiles.push({
		name: profileName,
		path: `profile-${profileIdGenerator()}`,
	});

	return newConfig;
};
