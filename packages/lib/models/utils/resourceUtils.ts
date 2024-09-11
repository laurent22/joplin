import type { ResourceEntity } from '../../services/database/types';
import * as mime from '../../mime-utils';
import { filename } from '@joplin/utils/path';

// This file contains resource-related utilities that do not
// depend on the database, settings, etc.

export const resourceFilename = (resource: ResourceEntity, encryptedBlob = false) => {
	let extension = encryptedBlob ? 'crypted' : resource.file_extension;
	if (!extension) extension = resource.mime ? mime.toFileExtension(resource.mime) : '';
	extension = extension ? `.${extension}` : '';
	return resource.id + extension;
};

export const resourceRelativePath = (resource: ResourceEntity, relativeResourceDirPath: string, encryptedBlob = false) => {
	return `${relativeResourceDirPath}/${resourceFilename(resource, encryptedBlob)}`;
};

export const resourceFullPath = (resource: ResourceEntity, resourceDirPath: string, encryptedBlob = false) => {
	return `${resourceDirPath}/${resourceFilename(resource, encryptedBlob)}`;
};

export const internalUrl = (resource: ResourceEntity) => {
	return `:/${resource.id}`;
};

export const resourcePathToId = (path: string) => {
	return filename(path);
};

export const isResourceUrl = (url: string) => {
	return url && url.length === 34 && url[0] === ':' && url[1] === '/';
};

export const resourceUrlToId = (url: string) => {
	if (!isResourceUrl(url)) throw new Error(`Not a valid resource URL: ${url}`);
	return url.substring(2);
};

export const isSupportedImageMimeType = (type: string) => {
	const imageMimeTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp', 'image/avif', 'image/bmp'];
	return imageMimeTypes.indexOf(type.toLowerCase()) >= 0;
};
