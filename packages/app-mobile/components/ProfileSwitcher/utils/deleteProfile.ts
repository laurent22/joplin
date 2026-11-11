import { Profile, ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import { getDatabaseName, getPluginDataDir, getResourceDir, saveProfileConfig } from '../../../services/profiles';
import { deleteProfileById, getCurrentProfile, isSubProfile } from '@joplin/lib/services/profileConfig';
import Setting from '@joplin/lib/models/Setting';
import shim, { MessageBoxType } from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import resolvePathWithinDir from '@joplin/lib/utils/resolvePathWithinDir';
import DatabaseDriver from '@joplin/lib/database-driver';
import { _ } from '@joplin/lib/locale';

const logger = Logger.create('deleteProfile');

interface DeleteProfileOptions {
	toDelete: Profile;
	profileConfig: ProfileConfig;
	databaseDriver: DatabaseDriver;
}

const deleteProfile = async (options: DeleteProfileOptions) => {
	logger.info('Deleting profile config', options.toDelete.id);
	if (options.toDelete.id === options.profileConfig.currentProfileId) throw new Error(_('The active profile cannot be deleted. Switch to a different profile and try again.'));
	const subProfile = isSubProfile(options.toDelete);

	// Deleting the default profile must be handled differently. We can't delete the whole directory because it contains other profiles and global settings
	if (subProfile) {
		const newConfig = deleteProfileById(options.profileConfig, options.toDelete.id);
		// Save the profile config early. If the later deletion steps fail, this prevents the user from
		// opening a partially-deleted profile. The default profile does not get deleted from the list,
		// but the data will be cleared
		await saveProfileConfig(newConfig);
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
		// Ignore database deletion failures. If the profile hasn't been initialized, the database
		// may not yet exist. In this case, it should still be possible to delete the profile.
		logger.warn('Failed to delete database: ', error, '. Was the profile initialized?');
	}

	if (subProfile) {
		logger.info('Deleting resources directory', resourcesDir);
		await shim.fsDriver().remove(resourcesDir);
	} else {
		try {
			const items = await shim.fsDriver().readDirStats(resourcesDir);

			for (const item of items) {
				if (item.isDirectory()) continue;
				const fileName = item.path;

				if (/^[a-f0-9]{32}\./.test(fileName)) {
					const fullPath = `${resourcesDir}/${fileName}`;
					try {
						await shim.fsDriver().unlink(fullPath);
						logger.info('Deleted resource file: ', fullPath);
					} catch (error) {
						logger.error('Error deleting resource file: ', fullPath, error);
					}
				}
			}
		} catch (error) {
			logger.error('Error reading resources directory: ', resourcesDir, error);
		}
	}

	logger.info('Deleting plugin data directory', pluginDataDir);
	await shim.fsDriver().remove(pluginDataDir);

	if (!subProfile) {
		await shim.showMessageBox(_('The default profile has been reset.'), { type: MessageBoxType.Info });
	}
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
	// Add an extra check here to verify that deleting the other profile's resource directory
	// doesn't also delete **the active** profile's resource directory. On mobile, the resources
	// directory can sometimes contain other profile directories (e.g. in the case of the default profile).
	if (isSubProfile(target) && resolvePathWithinDir(resourcesDir, Setting.value('resourceDir')) !== null) {
		throw new Error('Refusing to delete a directory that contains the active profile\'s resource directory.');
	}
	return resourcesDir;
};


const getTargetPluginDataDirectory = ({ toDelete: target }: DeleteProfileOptions) => {
	const pluginDataDir = getPluginDataDir(target, isSubProfile(target));
	if (isSubProfile(target) && resolvePathWithinDir(pluginDataDir, Setting.value('pluginDataDir')) !== null) {
		throw new Error('Refusing to delete a directory that contains the active profile\'s plugin data directory.');
	}
	return pluginDataDir;
};
