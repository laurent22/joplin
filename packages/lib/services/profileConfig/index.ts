import { rtrimSlashes, trimSlashes } from '../../path-utils';
import shim from '../../shim';
import { MenuItem } from '../commands/MenuUtils';
import { defaultProfile, defaultProfileConfig, Profile, ProfileConfig, ProfileSwitchClickHandler } from './types';

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
	await shim.fsDriver().writeFile(profileConfigPath, JSON.stringify(config), 'utf8');
};

export const getCurrentProfile = (config: ProfileConfig): Profile => {
	return { ...config.profiles[config.currentProfile] };
};

export const getProfileFullPath = (profile: Profile, rootProfilePath: string): string => {
	let p = trimSlashes(profile.path);
	if (p === '.') p = '';
	return rtrimSlashes(`${rtrimSlashes(rootProfilePath)}/${p}`);
};

export const getSwitchProfileMenuItems = (config: ProfileConfig, onClick: ProfileSwitchClickHandler): MenuItem[] => {
	const output: MenuItem[] = [];

	for (let i = 0; i < config.profiles.length; i++) {
		const profile = config.profiles[i];

		output.push({
			id: `profile-${i}`,
			label: profile.name,
			enabled: true,
			type: 'checkbox',
			checked: config.currentProfile === i,
			click: () => {
				onClick(config, i);
			},
		});
	}

	return output;
};

// export const getRootProfilePath = async (currentDir:string):Promise<string> => {
// 	currentDir = rtrimSlashes(currentDir);

// 	const parentDir = dirname(currentDir);

// 	if (await shim.fsDriver().exists(parentDir + '/database.sqlite')) {
// 		return parentDir;
// 	} else {
// 		return currentDir;
// 	}
// }
// export const getRootProfilePath = async (currentDir:string):Promise<string> => {
// 	currentDir = rtrimSlashes(currentDir);

// 	const parentDir = dirname(currentDir);

// 	if (await shim.fsDriver().exists(parentDir + '/database.sqlite')) {
// 		return parentDir;
// 	} else {
// 		return currentDir;
// 	}
// }
