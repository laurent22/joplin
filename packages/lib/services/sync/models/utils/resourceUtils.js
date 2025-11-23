"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSupportedImageMimeType = exports.resourceUrlToId = exports.isResourceUrl = exports.resourcePathToId = exports.internalUrl = exports.resourceFullPath = exports.resourceRelativePath = exports.resourceFilename = void 0;
const mime = require("../../mime-utils");
const path_1 = require("@joplin/utils/path");
// This file contains resource-related utilities that do not
// depend on the database, settings, etc.
const resourceFilename = (resource, encryptedBlob = false) => {
    let extension = encryptedBlob ? 'crypted' : resource.file_extension;
    if (!extension)
        extension = resource.mime ? mime.toFileExtension(resource.mime) : '';
    extension = extension ? `.${extension}` : '';
    return resource.id + extension;
};
exports.resourceFilename = resourceFilename;
const resourceRelativePath = (resource, relativeResourceDirPath, encryptedBlob = false) => {
    return `${relativeResourceDirPath}/${(0, exports.resourceFilename)(resource, encryptedBlob)}`;
};
exports.resourceRelativePath = resourceRelativePath;
const resourceFullPath = (resource, resourceDirPath, encryptedBlob = false) => {
    return `${resourceDirPath}/${(0, exports.resourceFilename)(resource, encryptedBlob)}`;
};
exports.resourceFullPath = resourceFullPath;
const internalUrl = (resource) => {
    return `:/${resource.id}`;
};
exports.internalUrl = internalUrl;
const resourcePathToId = (path) => {
    return (0, path_1.filename)(path);
};
exports.resourcePathToId = resourcePathToId;
const isResourceUrl = (url) => {
    return url && url.length === 34 && url[0] === ':' && url[1] === '/';
};
exports.isResourceUrl = isResourceUrl;
const resourceUrlToId = (url) => {
    if (!(0, exports.isResourceUrl)(url))
        throw new Error(`Not a valid resource URL: ${url}`);
    return url.substring(2);
};
exports.resourceUrlToId = resourceUrlToId;
const isSupportedImageMimeType = (type) => {
    const imageMimeTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp', 'image/avif', 'image/bmp'];
    return imageMimeTypes.indexOf(type.toLowerCase()) >= 0;
};
exports.isSupportedImageMimeType = isSupportedImageMimeType;
