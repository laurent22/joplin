import { getCurrentProfile, getProfileFullPath, loadProfileConfig } from '.';
import Setting from '../../models/Setting';

export default async (rootProfileDir: string) => {
	const profileConfig = await loadProfileConfig(`${rootProfileDir}/profiles.json`);
	const profileDir = getProfileFullPath(getCurrentProfile(profileConfig), rootProfileDir);
	Setting.setConstant('isSubProfile', profileConfig.currentProfile !== 0);
	Setting.setConstant('rootProfileDir', rootProfileDir);
	Setting.setConstant('profileDir', profileDir);
	return {
		profileConfig,
		profileDir,
	};
};
