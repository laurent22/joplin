import Resource from '@joplin/lib/models/Resource';
import { ResourceEntity } from '@joplin/lib/services/database/types';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
const FileViewer = require('react-native-file-viewer').default;


const logger = Logger.create('showResource');

const showResource = async (item: ResourceEntity) => {
	const resourcePath = Resource.fullPath(item);
	logger.info(`Opening resource: ${resourcePath}`);

	if (shim.mobilePlatform() === 'web') {
		const url = URL.createObjectURL(await shim.fsDriver().fileAtPath(resourcePath));
		const w = window.open(url, '_blank');
		w?.addEventListener('close', () => {
			URL.revokeObjectURL(url);
		}, { once: true });
	} else {
		await FileViewer.open(resourcePath);
	}
};

export default showResource;
