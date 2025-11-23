"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractNoteFromHTML = void 0;
exports.downloadMediaFile = downloadMediaFile;
exports.createResourcesFromPaths = createResourcesFromPaths;
exports.extractMediaUrls = extractMediaUrls;
exports.default = default_1;
const Setting_1 = require("../../../models/Setting");
const shim_1 = require("../../../shim");
const uuid_1 = require("../../../uuid");
const readonlyProperties_1 = require("../utils/readonlyProperties");
const defaultSaveOptions_1 = require("../utils/defaultSaveOptions");
const defaultAction_1 = require("../utils/defaultAction");
const BaseModel_1 = require("../../../BaseModel");
const defaultLoadOptions_1 = require("../utils/defaultLoadOptions");
const Api_1 = require("../Api");
const markdownUtils_1 = require("../../../markdownUtils");
const collectionToPaginatedResults_1 = require("../utils/collectionToPaginatedResults");
const database_1 = require("../../../database");
const Folder_1 = require("../../../models/Folder");
const Note_1 = require("../../../models/Note");
const Tag_1 = require("../../../models/Tag");
const Resource_1 = require("../../../models/Resource");
const htmlUtils_1 = require("../../../htmlUtils");
const markupLanguageUtils_1 = require("../../../markupLanguageUtils");
const mimeUtils = require("../../../mime-utils");
const md5 = require('md5');
const HtmlToMd_1 = require("../../../HtmlToMd");
const urlUtils = require('../../../urlUtils.js');
const ArrayUtils = require("../../../ArrayUtils");
const Logger_1 = require("@joplin/utils/Logger");
const { mimeTypeFromHeaders } = require('../../../net-utils');
const { fileExtension, safeFileExtension, safeFilename, filename } = require('../../../path-utils');
const { MarkupToHtml } = require('@joplin/renderer');
const { ErrorNotFound } = require('../utils/errors');
const url_1 = require("@joplin/utils/url");
const logger = Logger_1.default.create('routes/notes');
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
let htmlToMdParser_ = null;
function htmlToMdParser() {
    if (htmlToMdParser_)
        return htmlToMdParser_;
    htmlToMdParser_ = new HtmlToMd_1.default();
    return htmlToMdParser_;
}
async function requestNoteToNote(requestNote) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const output = {
        title: requestNote.title ? requestNote.title : '',
        body: requestNote.body ? requestNote.body : '',
    };
    if (requestNote.id)
        output.id = requestNote.id;
    const baseUrl = requestNote.base_url ? requestNote.base_url : '';
    if (requestNote.body_html) {
        if (requestNote.convert_to === 'html') {
            const style = await buildNoteStyleSheet(requestNote.stylesheets);
            const minifyOptions = {
                // Remove all spaces and, especially, newlines from tag attributes, as that would
                // break the rendering.
                customAttrCollapse: /.*/,
                // Need to remove all whitespaces because whitespace at a beginning of a line
                // means a code block in Markdown.
                collapseWhitespace: true,
                minifyCSS: true,
                maxLineLength: 300,
            };
            const uglifycss = require('uglifycss');
            const styleString = uglifycss.processString(style.join('\n'), {
                // Need to set a max length because Ace Editor takes forever
                // to display notes with long lines.
                maxLineLen: 200,
            });
            const styleTag = style.length ? `<style>${styleString}</style>` + '\n' : '';
            let minifiedHtml = '';
            try {
                // We use requireDynamic here -- html-minifier seems to not work in environments
                // that lack `fs`.
                const minify = shim_1.default.requireDynamic('html-minifier').minify;
                minifiedHtml = minify(requestNote.body_html, minifyOptions);
            }
            catch (error) {
                console.warn('Could not minify HTML - using non-minified HTML instead', error);
                minifiedHtml = requestNote.body_html;
            }
            output.body = styleTag + minifiedHtml;
            output.body = htmlUtils_1.default.prependBaseUrl(output.body, baseUrl);
            output.markup_language = MarkupToHtml.MARKUP_LANGUAGE_HTML;
        }
        else {
            // Convert to Markdown
            // Parsing will not work if the HTML is not wrapped in a top level tag, which is not guaranteed
            // when getting the content from elsewhere. So here wrap it - it won't change anything to the final
            // rendering but it makes sure everything will be parsed.
            output.body = await htmlToMdParser().parse(`<div>${requestNote.body_html}</div>`, {
                baseUrl: baseUrl,
                anchorNames: requestNote.anchor_names ? requestNote.anchor_names : [],
                convertEmbeddedPdfsToLinks: true,
            });
            output.markup_language = MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN;
        }
    }
    if (requestNote.parent_id) {
        output.parent_id = requestNote.parent_id;
    }
    else {
        const folder = await Folder_1.default.defaultFolder();
        if (!folder)
            throw new Error('Cannot find folder for note');
        output.parent_id = folder.id;
    }
    if ('source_url' in requestNote)
        output.source_url = requestNote.source_url;
    if ('author' in requestNote)
        output.author = requestNote.author;
    if ('user_updated_time' in requestNote)
        output.user_updated_time = database_1.default.formatValue(database_1.default.TYPE_INT, requestNote.user_updated_time);
    if ('user_created_time' in requestNote)
        output.user_created_time = database_1.default.formatValue(database_1.default.TYPE_INT, requestNote.user_created_time);
    if ('is_todo' in requestNote)
        output.is_todo = database_1.default.formatValue(database_1.default.TYPE_INT, requestNote.is_todo);
    if ('todo_due' in requestNote)
        output.todo_due = database_1.default.formatValue(database_1.default.TYPE_INT, requestNote.todo_due);
    if ('todo_completed' in requestNote)
        output.todo_completed = database_1.default.formatValue(database_1.default.TYPE_INT, requestNote.todo_completed);
    if ('markup_language' in requestNote)
        output.markup_language = database_1.default.formatValue(database_1.default.TYPE_INT, requestNote.markup_language);
    if ('longitude' in requestNote)
        output.longitude = requestNote.longitude;
    if ('latitude' in requestNote)
        output.latitude = requestNote.latitude;
    if ('altitude' in requestNote)
        output.altitude = requestNote.altitude;
    if ('source' in requestNote)
        output.source = requestNote.source;
    if (!output.markup_language)
        output.markup_language = MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN;
    return output;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function buildNoteStyleSheet(stylesheets) {
    if (!stylesheets)
        return [];
    const output = [];
    for (const stylesheet of stylesheets) {
        if (stylesheet.type === 'text') {
            output.push(stylesheet.value);
        }
        else if (stylesheet.type === 'url') {
            try {
                const tempPath = `${Setting_1.default.value('tempDir')}/${md5(`${Math.random()}_${Date.now()}`)}.css`;
                await shim_1.default.fetchBlob(stylesheet.value, { path: tempPath, maxRetry: 1 });
                const text = await shim_1.default.fsDriver().readFile(tempPath);
                output.push(text);
                await shim_1.default.fsDriver().remove(tempPath);
            }
            catch (error) {
                logger.warn(`Cannot download stylesheet at ${stylesheet.value}`, error);
            }
        }
        else {
            throw new Error(`Invalid stylesheet type: ${stylesheet.type}`);
        }
    }
    return output;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function tryToGuessExtFromMimeType(response, mediaPath) {
    const mimeType = mimeTypeFromHeaders(response.headers);
    if (!mimeType)
        return mediaPath;
    const newExt = mimeUtils.toFileExtension(mimeType);
    if (!newExt)
        return mediaPath;
    const newMediaPath = `${mediaPath}.${newExt}`;
    await shim_1.default.fsDriver().move(mediaPath, newMediaPath);
    return newMediaPath;
}
const getFileExtension = (url, isDataUrl) => {
    let fileExt = isDataUrl ? mimeUtils.toFileExtension(mimeUtils.fromDataUrl(url)) : safeFileExtension(fileExtension(url).toLowerCase());
    if (!mimeUtils.fromFileExtension(fileExt))
        fileExt = ''; // If the file extension is unknown - clear it.
    if (fileExt)
        fileExt = `.${fileExt}`;
    return fileExt;
};
const generateMediaPath = (url, isDataUrl, fileExt) => {
    const tempDir = Setting_1.default.value('tempDir');
    const name = isDataUrl ? md5(`${Math.random()}_${Date.now()}`) : filename(url);
    // Append a UUID because simply checking if the file exists is not enough since
    // multiple resources can be downloaded at the same time (race condition).
    const mediaPath = `${tempDir}/${safeFilename(name)}_${uuid_1.default.create()}${fileExt}`;
    return mediaPath;
};
const isValidUrl = (url, isDataUrl, urlProtocol, allowedProtocols) => {
    if (!urlProtocol)
        return false;
    // PDFs and other heavy resources are often served as separate files instead of data urls, its very unlikely to encounter a pdf as a data url
    if (isDataUrl && !url.toLowerCase().startsWith('data:image/')) {
        logger.warn(`Resources in data URL format is only supported for images ${url}`);
        return false;
    }
    const defaultAllowedProtocols = ['http:', 'https:', 'data:'];
    const allowed = allowedProtocols !== null && allowedProtocols !== void 0 ? allowedProtocols : defaultAllowedProtocols;
    const isAllowedProtocol = allowed.includes(urlProtocol);
    return isAllowedProtocol;
};
async function downloadMediaFile(url, fetchOptions, allowedProtocols) {
    var _a;
    // The URL we get to download have been extracted from the Markdown document
    url = markdownUtils_1.default.unescapeLinkUrl(url);
    const isDataUrl = url && url.toLowerCase().indexOf('data:') === 0;
    const urlProtocol = (_a = urlUtils.urlProtocol(url)) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    if (!isValidUrl(url, isDataUrl, urlProtocol, allowedProtocols)) {
        return '';
    }
    const fileExt = getFileExtension(url, isDataUrl);
    const mediaPath = generateMediaPath(url, isDataUrl, fileExt);
    let newMediaPath = undefined;
    try {
        if (isDataUrl) {
            await shim_1.default.imageFromDataUrl(url, mediaPath);
        }
        else if (urlProtocol === 'file:') {
            const localPath = (0, url_1.fileUriToPath)(url);
            await shim_1.default.fsDriver().copy(localPath, mediaPath);
        }
        else {
            const response = await shim_1.default.fetchBlob(url, Object.assign({ path: mediaPath, maxRetry: 1 }, fetchOptions));
            if (!fileExt) {
                // If we could not find the file extension from the URL, try to get it
                // now based on the Content-Type header.
                newMediaPath = await tryToGuessExtFromMimeType(response, mediaPath);
            }
        }
        return newMediaPath !== null && newMediaPath !== void 0 ? newMediaPath : mediaPath;
    }
    catch (error) {
        logger.warn(`Cannot download image at ${url}`, error);
        return '';
    }
}
async function downloadMediaFiles(urls, fetchOptions, allowedProtocols) {
    var _a;
    const output = [];
    const downloadController = (_a = fetchOptions === null || fetchOptions === void 0 ? void 0 : fetchOptions.downloadController) !== null && _a !== void 0 ? _a : null;
    const downloadOne = async (url) => {
        if (downloadController)
            downloadController.imagesCount += 1;
        const mediaPath = await downloadMediaFile(url, fetchOptions, allowedProtocols);
        if (mediaPath)
            output.push({ path: mediaPath, originalUrl: url });
    };
    const maximumImageDownloadsAllowed = downloadController ? downloadController.maxImagesCount : Number.POSITIVE_INFINITY;
    const urlsAllowedByController = urls.slice(0, maximumImageDownloadsAllowed);
    logger.info(`Media files allowed to be downloaded: ${maximumImageDownloadsAllowed}`);
    const promises = [];
    for (const url of urlsAllowedByController) {
        promises.push(downloadOne(url));
    }
    await Promise.all(promises);
    if (downloadController) {
        downloadController.imageCountExpected = urls.length;
        downloadController.printStats(urls.length);
    }
    return output;
}
async function createResourcesFromPaths(mediaFiles) {
    const processFile = async (mediaFile) => {
        try {
            const resource = await shim_1.default.createResourceFromPath(mediaFile.path);
            return Object.assign(Object.assign({}, mediaFile), { resource });
        }
        catch (error) {
            logger.warn(`Cannot create resource for ${mediaFile.originalUrl}`, error);
            return Object.assign(Object.assign({}, mediaFile), { resource: null });
        }
    };
    const resources = mediaFiles.map(processFile);
    return Promise.all(resources);
}
async function removeTempFiles(urls) {
    for (const urlInfo of urls) {
        try {
            await shim_1.default.fsDriver().remove(urlInfo.path);
        }
        catch (error) {
            logger.warn(`Cannot remove ${urlInfo.path}`, error);
        }
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
function replaceUrlsByResources(markupLanguage, md, urls, imageSizes) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const imageSizesIndexes = {};
    if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_HTML) {
        return htmlUtils_1.default.replaceMediaUrls(md, (url) => {
            const urlInfo = urls.find(u => u.originalUrl === url);
            if (!urlInfo || !urlInfo.resource)
                return url;
            return Resource_1.default.internalUrl(urlInfo.resource);
        });
    }
    else {
        // Proper Regex:
        //
        //     /(!\[.*?\]\()([^\s\)]+)(.*?\))/g
        //
        // Broken regex when [embedded_pdf] support was added, and fixed with
        // `before.startsWith('[![')` hack. But ideally that function should be
        // unit tested to prevent it from being broken again.
        //
        //     /(!?\[.*?\]\()([^\s\)]+)(.*?\))/g
        //
        // eslint-disable-next-line no-useless-escape, @typescript-eslint/no-explicit-any -- Old code before rule was applied
        return md.replace(/(!?\[.*?\]\()([^\s\)]+)(.*?\))/g, (_match, before, url, after) => {
            let type = 'link';
            if (before.startsWith('[embedded_pdf]')) {
                type = 'pdf';
            }
            else if (before.startsWith('![') || before.startsWith('[![')) {
                type = 'image';
            }
            const urlInfo = urls.find(u => u.originalUrl === url);
            if (type === 'link' || !urlInfo || !urlInfo.resource)
                return before + url + after;
            const resourceUrl = Resource_1.default.internalUrl(urlInfo.resource);
            if (type === 'pdf') {
                return `[${markdownUtils_1.default.escapeLinkUrl(url)}](${resourceUrl}${after}`;
            }
            if (!(urlInfo.originalUrl in imageSizesIndexes))
                imageSizesIndexes[urlInfo.originalUrl] = 0;
            const imageSizesCollection = imageSizes[urlInfo.originalUrl];
            if (!imageSizesCollection) {
                // Either its not an image or we don't know the size of the image
                // In some cases, we won't find the image size information for that particular image URL. Normally
                // it will only happen when using the "Clip simplified page" feature, which can modify the
                // image URLs (for example it will select a smaller size resolution). In that case, it's
                // fine to return the image as-is because it has already good dimensions.
                return before + resourceUrl + after;
            }
            const imageSize = imageSizesCollection[imageSizesIndexes[urlInfo.originalUrl]];
            imageSizesIndexes[urlInfo.originalUrl]++;
            if (imageSize && (imageSize.naturalWidth !== imageSize.width || imageSize.naturalHeight !== imageSize.height)) {
                return `<img width="${imageSize.width}" height="${imageSize.height}" src="${resourceUrl}"/>`;
            }
            else {
                return before + resourceUrl + after;
            }
        });
    }
}
function extractMediaUrls(markupLanguage, text) {
    const urls = [];
    urls.push(...ArrayUtils.unique(markupLanguageUtils_1.default.extractImageUrls(markupLanguage, text)));
    urls.push(...ArrayUtils.unique(markupLanguageUtils_1.default.extractPdfUrls(markupLanguage, text)));
    return urls;
}
// Note must have been saved first
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
async function attachImageFromDataUrl(note, imageDataUrl, cropRect) {
    const tempDir = Setting_1.default.value('tempDir');
    const mime = mimeUtils.fromDataUrl(imageDataUrl);
    let ext = mimeUtils.toFileExtension(mime) || '';
    if (ext)
        ext = `.${ext}`;
    const tempFilePath = `${tempDir}/${md5(`${Math.random()}_${Date.now()}`)}${ext}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const imageConvOptions = {};
    if (cropRect)
        imageConvOptions.cropRect = cropRect;
    await shim_1.default.imageFromDataUrl(imageDataUrl, tempFilePath, imageConvOptions);
    return await shim_1.default.attachFileToNote(note, tempFilePath);
}
const extractNoteFromHTML = async (requestNote, requestId, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
imageSizes, fetchOptions, allowedProtocols) => {
    const note = await requestNoteToNote(requestNote);
    const mediaUrls = extractMediaUrls(note.markup_language, note.body);
    logger.info(`Request (${requestId}): Downloading media files: ${mediaUrls.length}`);
    const mediaFiles = await downloadMediaFiles(mediaUrls, fetchOptions, allowedProtocols);
    logger.info(`Request (${requestId}): Creating resources from paths (resizing images): ${mediaFiles.length}`);
    const resources = await createResourcesFromPaths(mediaFiles);
    logger.info(`Request (${requestId}): Deleting temporary files`);
    await removeTempFiles(resources);
    logger.info(`Request (${requestId}): Replacing urls by resources`);
    note.body = replaceUrlsByResources(note.markup_language, note.body, resources, imageSizes);
    logger.info(`Request (${requestId}): Saving note...`);
    const saveOptions = (0, defaultSaveOptions_1.default)('POST', note.id);
    saveOptions.autoTimestamp = false; // No auto-timestamp because user may have provided them
    const timestamp = Date.now();
    note.updated_time = timestamp;
    note.created_time = timestamp;
    if (!('user_updated_time' in note))
        note.user_updated_time = timestamp;
    if (!('user_created_time' in note))
        note.user_created_time = timestamp;
    return { note, saveOptions, resources };
};
exports.extractNoteFromHTML = extractNoteFromHTML;
async function default_1(request, id = null, link = null) {
    if (request.method === 'GET') {
        if (link && link === 'tags') {
            return (0, collectionToPaginatedResults_1.default)(BaseModel_1.ModelType.Tag, await Tag_1.default.tagsByNoteId(id), request);
        }
        else if (link && link === 'resources') {
            const note = await Note_1.default.load(id);
            if (!note)
                throw new ErrorNotFound();
            const resourceIds = await Note_1.default.linkedResourceIds(note.body);
            const output = [];
            const loadOptions = (0, defaultLoadOptions_1.default)(request, BaseModel_1.default.TYPE_RESOURCE);
            for (const resourceId of resourceIds) {
                output.push(await Resource_1.default.load(resourceId, loadOptions));
            }
            return (0, collectionToPaginatedResults_1.default)(BaseModel_1.ModelType.Resource, output, request);
        }
        else if (link) {
            throw new ErrorNotFound();
        }
        const sql = [];
        if (request.query.include_deleted !== '1')
            sql.push('deleted_time = 0');
        if (request.query.include_conflicts !== '1')
            sql.push('is_conflict = 0');
        return (0, defaultAction_1.default)(BaseModel_1.default.TYPE_NOTE, request, id, link, null, { sql: sql.join(' AND ') });
    }
    if (request.method === Api_1.RequestMethod.POST) {
        const requestId = Date.now();
        const requestNote = JSON.parse(request.body);
        if (!requestNote)
            throw new Error(`Could not parse note body: ${request.body}`);
        // const allowFileProtocolImages = urlUtils.urlProtocol(requestNote.base_url).toLowerCase() === 'file:';
        const imageSizes = requestNote.image_sizes ? requestNote.image_sizes : {};
        logger.info('Images:', imageSizes);
        const allowedProtocolsForDownloadMediaFiles = ['http:', 'https:', 'file:', 'data:'];
        const extracted = await (0, exports.extractNoteFromHTML)(requestNote, String(requestId), imageSizes, undefined, allowedProtocolsForDownloadMediaFiles);
        let note = await Note_1.default.save(extracted.note, extracted.saveOptions);
        if (requestNote.tags) {
            const tagTitles = requestNote.tags.split(',');
            await Tag_1.default.setNoteTagsByTitles(note.id, tagTitles);
        }
        if (requestNote.image_data_url) {
            note = await attachImageFromDataUrl(note, requestNote.image_data_url, requestNote.crop_rect);
        }
        logger.info(`Request (${requestId}): Created note ${note.id}`);
        return note;
    }
    if (request.method === 'PUT') {
        const note = await Note_1.default.load(id);
        if (!note)
            throw new ErrorNotFound();
        const saveOptions = Object.assign(Object.assign({}, (0, defaultSaveOptions_1.default)('PUT', note.id)), { autoTimestamp: false, userSideValidation: true });
        const timestamp = Date.now();
        const newProps = request.bodyJson((0, readonlyProperties_1.default)('PUT'));
        if (!('user_updated_time' in newProps))
            newProps.user_updated_time = timestamp;
        let newNote = Object.assign(Object.assign(Object.assign({}, note), newProps), { updated_time: timestamp });
        newNote = await Note_1.default.save(newNote, saveOptions);
        const requestNote = JSON.parse(request.body);
        if (requestNote.tags || requestNote.tags === '') {
            const tagTitles = requestNote.tags.split(',');
            await Tag_1.default.setNoteTagsByTitles(id, tagTitles);
        }
        return newNote;
    }
    if (request.method === Api_1.RequestMethod.DELETE) {
        await Note_1.default.delete(id, { toTrash: request.query.permanent !== '1', sourceDescription: 'api/notes DELETE' });
        return;
    }
    return (0, defaultAction_1.default)(BaseModel_1.default.TYPE_NOTE, request, id, link);
}
