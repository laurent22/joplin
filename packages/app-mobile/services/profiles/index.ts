// Helper functions to reduce the boiler plate of loading and saving profiles on
// mobile

const RNExitApp = require('react-native-exit-app').default;
import { Profile, ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import { loadProfileConfig as libLoadProfileConfig, saveProfileConfig as libSaveProfileConfig } from '@joplin/lib/services/profileConfig/index';
import RNFetchBlob from 'rn-fetch-blob';

let dispatch_: Function = null;
export const setDispatch = (dispatch: Function) => {
	dispatch_ = dispatch;
};

export const getProfilesRootDir = () => {
	return RNFetchBlob.fs.dirs.DocumentDir;
};

export const getProfilesConfigPath = () => {
	return `${getProfilesRootDir()}/profiles.json`;
};

export const getResourceDir = (profile: Profile, isSubProfile: boolean) => {
	if (!isSubProfile) return getProfilesRootDir();
	return `${getProfilesRootDir()}/resources-${profile.id}`;
};

// The suffix is for debugging only
export const getDatabaseName = (profile: Profile, isSubProfile: boolean, suffix = '') => {
	if (!isSubProfile) return `joplin${suffix}.sqlite`;
	return `joplin-${profile.id}${suffix}.sqlite`;
};

export const loadProfileConfig = async () => {
	return libLoadProfileConfig(getProfilesConfigPath());
};

export const saveProfileConfig = async (profileConfig: ProfileConfig) => {
	await libSaveProfileConfig(getProfilesConfigPath(), profileConfig);
	dispatch_({
		type: 'PROFILE_CONFIG_SET',
		value: profileConfig,
	});
};

export const switchProfile = async (profileId: string) => {
	const config = await loadProfileConfig();
	if (config.currentProfileId === profileId) throw new Error('This profile is already active');

	config.currentProfileId = profileId;
	await saveProfileConfig(config);
	RNExitApp.exitApp();
};
