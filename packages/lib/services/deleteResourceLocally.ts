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

	const blobEncrypted = await Resource.shouldBlobBeEncrypted(resource);
	const fsDriver = shim.fsDriver();
	const filesToStage = [plainTextPath];
	if (await fsDriver.exists(encryptedPath)) filesToStage.push(encryptedPath);
	const stagedFiles: { originalPath: string; stagedPath: string }[] = [];

	try {
		for (const originalPath of filesToStage) {
			const stagedPath = await fsDriver.findUniqueFilename(`${originalPath}.delete`);
			await fsDriver.move(originalPath, stagedPath);
			stagedFiles.push({ originalPath, stagedPath });
		}

		await Resource.setLocalFileMissing(resource.id, blobEncrypted);
	} catch (error) {
		for (const { originalPath, stagedPath } of stagedFiles.reverse()) {
			try {
				await fsDriver.move(stagedPath, originalPath);
			} catch (restoreError) {
				logger.error(`Could not restore staged resource file ${stagedPath}`, restoreError);
			}
		}
		throw error;
	}

	for (const { stagedPath } of stagedFiles) await fsDriver.remove(stagedPath);
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
