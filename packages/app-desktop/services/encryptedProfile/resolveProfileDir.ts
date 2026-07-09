import determineBaseAppDirs from '@joplin/lib/determineBaseAppDirs';
import getAppName from '@joplin/lib/getAppName';
import envFromArgs from '@joplin/lib/envFromArgs';
import { getCurrentProfile, getProfileFullPath, loadProfileConfig } from '@joplin/lib/services/profileConfig';
import { readEncryptedProfileMetadata } from '@joplin/lib/services/encryptedProfile/metadata';
import { profileRequiresEncryptedUnlock, profileRequiresPendingMigration } from '@joplin/lib/services/encryptedProfile/EncryptedProfileService';
import { EncryptedProfileMetadata } from '@joplin/lib/services/encryptedProfile/types';
import { readFile } from 'fs-extra';

const getFlagValueFromArgs = (args: string[], flag: string, defaultValue: string|null) => {
	if (!args) return defaultValue;
	const index = args.indexOf(flag);
	if (index <= 0 || index >= args.length - 1) return defaultValue;
	const value = args[index + 1];
	return value ? value : defaultValue;
};

export interface ResolvedDesktopProfilePaths {
	rootProfileDir: string;
	profileDir: string;
	metadata: EncryptedProfileMetadata | null;
	requiresUnlock: boolean;
	requiresPendingMigration: boolean;
}

export const resolveDesktopProfilePaths = async (argv: string[]): Promise<ResolvedDesktopProfilePaths> => {
	const env = envFromArgs(argv);
	const profileFromArgs = getFlagValueFromArgs(argv, '--profile', null);
	const altInstanceId = getFlagValueFromArgs(argv, '--alt-instance-id', '') ?? '';
	const appName = getAppName(true, env === 'dev');
	const { rootProfileDir } = determineBaseAppDirs(profileFromArgs, appName, altInstanceId);
	const profileConfig = await loadProfileConfig(`${rootProfileDir}/profiles.json`);
	const profileDir = getProfileFullPath(getCurrentProfile(profileConfig), rootProfileDir);
	const metadata = await readEncryptedProfileMetadata(profileDir, async (path) => {
		return await readFile(path, 'utf8');
	});
	return {
		rootProfileDir,
		profileDir,
		metadata,
		requiresUnlock: profileRequiresEncryptedUnlock(metadata),
		requiresPendingMigration: profileRequiresPendingMigration(metadata),
	};
};
