import Logger from '@joplin/utils/Logger';
import Resource from '../models/Resource';
import Setting from '../models/Setting';
import shim from '../shim';

const logger = Logger.create('deleteResourceLocally');

export const deleteResourceLocally = async (resourceId: string) => {
	const resource = await Resource.load(resourceId);
	if (!resource) return;

	const localState = await Resource.localState(resource);
	const plainTextPath = Resource.fullPath(resource);
	const encryptedPath = Resource.fullPath(resource, true);
	const plainTextExists = await shim.fsDriver().exists(plainTextPath);
	if (resource.encryption_blob_encrypted || localState.fetch_status !== Resource.FETCH_STATUS_DONE || !plainTextExists) {
		logger.debug(`Resource ${resource.id} cannot be deleted locally while it is being downloaded or decrypted.`);
		return;
	}
	if (!await Resource.canDeleteLocalFile(resource)) {
		logger.debug(`Resource ${resource.id} cannot be deleted locally until it has been uploaded by synchronisation.`);
		return;
	}

	await shim.fsDriver().remove(plainTextPath);
	if (await shim.fsDriver().exists(encryptedPath)) await shim.fsDriver().remove(encryptedPath);
	await Resource.setLocalFileMissing(resource.id, await Resource.shouldBlobBeEncrypted(resource));
};

export const deleteSyncedResourcesLocally = async () => {
	const resources = await Resource.all({
		where: 'id NOT IN (SELECT resource_id FROM resource_local_states) OR id IN (SELECT resource_id FROM resource_local_states WHERE fetch_status = ?)',
		whereParams: [Resource.FETCH_STATUS_DONE],
		fields: ['id'],
	});

	for (const resource of resources) {
		if (Setting.value('sync.resourceDownloadMode') === 'always') {
			logger.debug('Stopping local attachment deletion because attachment download behaviour changed to Always.');
			break;
		}

		try {
			await deleteResourceLocally(resource.id);
		} catch (error) {
			logger.error(`Could not delete resource ${resource.id} locally`, error);
		}
	}
};
