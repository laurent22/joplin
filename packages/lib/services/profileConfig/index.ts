import { rtrimSlashes, trimSlashes } from '../../path-utils';
import shim from '../../shim';
import { MenuItem } from '../commands/MenuUtils';
import { defaultProfile, defaultProfileConfig, EditProfileClickHandler, NewProfileClickHandler, Profile, ProfileConfig, ProfileSwitchClickHandler } from './types';
import { _ } from '@joplin/lib/locale';
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

export const getSwitchProfileMenuItems = (config: ProfileConfig, onProfileSwitchClick: ProfileSwitchClickHandler, onNewProfileClick: NewProfileClickHandler, onEditProfileClick: EditProfileClickHandler): MenuItem[] => {
	const output: MenuItem[] = [];

	for (let i = 0; i < config.profiles.length; i++) {
		const profile = config.profiles[i];

		output.push({
			label: profile.name,
			type: 'checkbox',
			checked: config.currentProfile === i,
			click: () => {
				onProfileSwitchClick(i);
			},
		});
	}

	output.push({ type: 'separator' });

	output.push({
		label: _('Create new profile...'),
		click: () => {
			onNewProfileClick();
		},
	});

	output.push({
		label: _('Edit profile configuration...'),
		click: () => {
			onEditProfileClick();
		},
	});

	return output;
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
