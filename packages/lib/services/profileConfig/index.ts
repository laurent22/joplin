import shim from '../../shim';
import { defaultProfile, defaultProfileConfig, Profile, ProfileConfig } from './types';

export const parseProfileConfig = async (profileConfigPath: string): Promise<ProfileConfig> => {
	if (!(await shim.fsDriver().exists(profileConfigPath))) {
		return defaultProfileConfig();
	}

	try {
		const parsed = JSON.parse(profileConfigPath) as ProfileConfig;
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

export const getCurrentProfile = (config: ProfileConfig): Profile => {
	return { ...config.profiles[config.currentProfile] };
};

export const getProfileFullPath = (profile: Profile, rootProfilePath: string): string => {
	if (profile.isRelative) {
		return shim.fsDriver().resolve(rootProfilePath, profile.path);
	}

	return profile.path;
};
