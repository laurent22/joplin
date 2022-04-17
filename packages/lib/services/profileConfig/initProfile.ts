import { getCurrentProfile, getProfileFullPath, isSubProfile, loadProfileConfig } from '.';
import Setting from '../../models/Setting';

export default async (rootProfileDir: string) => {
	const profileConfig = await loadProfileConfig(`${rootProfileDir}/profiles.json`);
	const profileDir = getProfileFullPath(getCurrentProfile(profileConfig), rootProfileDir);
	const isSub = isSubProfile(getCurrentProfile(profileConfig));
	Setting.setConstant('isSubProfile', isSub);
	Setting.setConstant('rootProfileDir', rootProfileDir);
	Setting.setConstant('profileDir', profileDir);
	return {
		profileConfig,
		profileDir,
		isSubProfile: isSub,
	};
};
