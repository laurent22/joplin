import { Profile, ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import { getDatabaseName, getPluginDataDir, getResourceDir, saveProfileConfig } from '../../../services/profiles';
import { deleteProfileById, getCurrentProfile, isSubProfile } from '@joplin/lib/services/profileConfig';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import resolvePathWithinDir from '@joplin/lib/utils/resolvePathWithinDir';
import DatabaseDriver from '@joplin/lib/database-driver';

const logger = Logger.create('deleteProfile');

interface DeleteProfileOptions {
	toDelete: Profile;
	profileConfig: ProfileConfig;
	databaseDriver: DatabaseDriver;
}

const deleteProfile = async (options: DeleteProfileOptions) => {
	logger.info('Deleting profile config', options.toDelete.id);
	const newConfig = deleteProfileById(options.profileConfig, options.toDelete.id);
	await saveProfileConfig(newConfig);

	const subProfile = isSubProfile(options.toDelete);
	if (!subProfile) {
		throw new Error('Unsupported: Deleting non-sub-profile');
	}

	// Retrieve and validate both the database name and resources directory
	// **before** doing any deletion.
	const databaseName = getTargetDatabaseName(options);
	const resourcesDir = getTargetResourceDirectory(options);
	const pluginDataDir = getTargetPluginDataDirectory(options);

	logger.info('Deleting database', databaseName);
	const db = options.databaseDriver;
	try {
		await db.deleteDatabase({ name: databaseName });
	} catch (error) {
		logger.warn('Failed to delete database', error, 'Was the profile initialized?');
	}

	logger.info('Deleting resources directory', resourcesDir);
	await shim.fsDriver().remove(resourcesDir);

	logger.info('Deleting plugin data directory', resourcesDir);
	await shim.fsDriver().remove(pluginDataDir);
};

export default deleteProfile;


const getTargetDatabaseName = ({ toDelete: target, profileConfig }: DeleteProfileOptions) => {
	const databaseName = getDatabaseName(target, isSubProfile(target));

	const activeProfile = getCurrentProfile(profileConfig);
	const activeProfileDatabaseName = getDatabaseName(activeProfile, isSubProfile(activeProfile));
	if (databaseName === activeProfileDatabaseName) {
		throw new Error('Refusing to delete the active profile\'s database.');
	}

	return databaseName;
};


const getTargetResourceDirectory = ({ toDelete: target }: DeleteProfileOptions) => {
	const resourcesDir = getResourceDir(target, isSubProfile(target));
	// This is done with extra care: On mobile, the resources directory can sometimes contain directories
	// from other profiles.
	if (resolvePathWithinDir(resourcesDir, Setting.value('resourceDir')) !== null) {
		throw new Error('Refusing to delete a directory that contains the active profile\'s resource directory.');
	}
	return resourcesDir;
};


const getTargetPluginDataDirectory = ({ toDelete: target }: DeleteProfileOptions) => {
	const pluginDataDir = getPluginDataDir(target, isSubProfile(target));
	if (resolvePathWithinDir(pluginDataDir, Setting.value('pluginDataDir')) !== null) {
		throw new Error('Refusing to delete a directory that contains the active profile\'s plugin data directory.');
	}
	return pluginDataDir;
};
