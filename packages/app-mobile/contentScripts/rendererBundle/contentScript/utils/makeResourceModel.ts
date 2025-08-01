import { isResourceUrl, isSupportedImageMimeType, resourceFilename, resourceFullPath, resourceUrlToId } from '@joplin/lib/models/utils/resourceUtils';
import { OptionsResourceModel } from '@joplin/renderer/types';

const makeResourceModel = (resourceDirPath: string): OptionsResourceModel => {
	return {
		isResourceUrl,
		urlToId: resourceUrlToId,
		filename: resourceFilename,
		isSupportedImageMimeType,
		fullPath: (resource, encryptedBlob) => {
			return resourceFullPath(resource, resourceDirPath, encryptedBlob);
		},
	};
};

export default makeResourceModel;
