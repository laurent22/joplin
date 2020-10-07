"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Setting_1 = require("lib/models/Setting");
const Logger_1 = require("lib/Logger");
const shim_1 = require("lib/shim");
const uuid_1 = require("lib/uuid");
const { ltrimSlashes } = require('lib/path-utils.js');
const { Database } = require('lib/database.js');
const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');
const Tag = require('lib/models/Tag');
const BaseItem = require('lib/models/BaseItem');
const Resource = require('lib/models/Resource');
const BaseModel = require('lib/BaseModel');
const htmlUtils = require('lib/htmlUtils');
const markupLanguageUtils = require('lib/markupLanguageUtils');
const mimeUtils = require('lib/mime-utils.js').mime;
const md5 = require('md5');
const HtmlToMd = require('lib/HtmlToMd');
const urlUtils = require('lib/urlUtils.js');
const ArrayUtils = require('lib/ArrayUtils.js');
const { netUtils } = require('lib/net-utils');
const { fileExtension, safeFileExtension, safeFilename, filename } = require('lib/path-utils');
const ApiResponse = require('lib/services/rest/ApiResponse');
const SearchEngineUtils = require('lib/services/searchengine/SearchEngineUtils');
const { FoldersScreenUtils } = require('lib/folders-screen-utils.js');
const uri2path = require('file-uri-to-path');
const { MarkupToHtml } = require('lib/joplin-renderer');
const { ErrorMethodNotAllowed, ErrorForbidden, ErrorBadRequest, ErrorNotFound } = require('./errors');
class Api {
    constructor(token = null, actionApi = null) {
        this.knownNounces_ = {};
        this.token_ = token;
        this.logger_ = new Logger_1.default();
        this.actionApi_ = actionApi;
    }
    get token() {
        return typeof this.token_ === 'function' ? this.token_() : this.token_;
    }
    parsePath(path) {
        path = ltrimSlashes(path);
        if (!path)
            return { callName: '', params: [] };
        const pathParts = path.split('/');
        const callSuffix = pathParts.splice(0, 1)[0];
        const callName = `action_${callSuffix}`;
        return {
            callName: callName,
            params: pathParts,
        };
    }
    route(method, path, query = null, body = null, files = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!files)
                files = [];
            if (!query)
                query = {};
            const parsedPath = this.parsePath(path);
            if (!parsedPath.callName)
                throw new ErrorNotFound(); // Nothing at the root yet
            if (query && query.nounce) {
                const requestMd5 = md5(JSON.stringify([method, path, body, query, files.length]));
                if (this.knownNounces_[query.nounce] === requestMd5) {
                    throw new ErrorBadRequest('Duplicate Nounce');
                }
                this.knownNounces_[query.nounce] = requestMd5;
            }
            const request = {
                method: method,
                path: ltrimSlashes(path),
                query: query ? query : {},
                body: body,
                bodyJson_: null,
                bodyJson: function (disallowedProperties = null) {
                    if (!this.bodyJson_)
                        this.bodyJson_ = JSON.parse(this.body);
                    if (disallowedProperties) {
                        const filteredBody = Object.assign({}, this.bodyJson_);
                        for (let i = 0; i < disallowedProperties.length; i++) {
                            const n = disallowedProperties[i];
                            delete filteredBody[n];
                        }
                        return filteredBody;
                    }
                    return this.bodyJson_;
                },
                files: files,
            };
            let id = null;
            let link = null;
            const params = parsedPath.params;
            if (params.length >= 1) {
                id = params[0];
                params.splice(0, 1);
                if (params.length >= 1) {
                    link = params[0];
                    params.splice(0, 1);
                }
            }
            request.params = params;
            if (!this[parsedPath.callName])
                throw new ErrorNotFound();
            try {
                return yield this[parsedPath.callName](request, id, link);
            }
            catch (error) {
                if (!error.httpCode)
                    error.httpCode = 500;
                throw error;
            }
        });
    }
    setLogger(l) {
        this.logger_ = l;
    }
    logger() {
        return this.logger_;
    }
    readonlyProperties(requestMethod) {
        const output = ['created_time', 'updated_time', 'encryption_blob_encrypted', 'encryption_applied', 'encryption_cipher_text'];
        if (requestMethod !== 'POST')
            output.splice(0, 0, 'id');
        return output;
    }
    fields_(request, defaultFields) {
        const query = request.query;
        if (!query || !query.fields)
            return defaultFields;
        if (Array.isArray(query.fields))
            return query.fields.slice();
        const fields = query.fields
            .split(',')
            .map((f) => f.trim())
            .filter((f) => !!f);
        return fields.length ? fields : defaultFields;
    }
    checkToken_(request) {
        // For now, whitelist some calls to allow the web clipper to work
        // without an extra auth step
        const whiteList = [['GET', 'ping'], ['GET', 'tags'], ['GET', 'folders'], ['POST', 'notes']];
        for (let i = 0; i < whiteList.length; i++) {
            if (whiteList[i][0] === request.method && whiteList[i][1] === request.path)
                return;
        }
        if (!this.token)
            return;
        if (!request.query || !request.query.token)
            throw new ErrorForbidden('Missing "token" parameter');
        if (request.query.token !== this.token)
            throw new ErrorForbidden('Invalid "token" parameter');
    }
    defaultAction_(modelType, request, id = null, link = null) {
        return __awaiter(this, void 0, void 0, function* () {
            this.checkToken_(request);
            if (link)
                throw new ErrorNotFound(); // Default action doesn't support links at all for now
            const ModelClass = BaseItem.getClassByItemType(modelType);
            const getOneModel = () => __awaiter(this, void 0, void 0, function* () {
                const model = yield ModelClass.load(id);
                if (!model)
                    throw new ErrorNotFound();
                return model;
            });
            if (request.method === 'GET') {
                if (id) {
                    return getOneModel();
                }
                else {
                    const options = {};
                    const fields = this.fields_(request, []);
                    if (fields.length)
                        options.fields = fields;
                    return yield ModelClass.all(options);
                }
            }
            if (request.method === 'PUT' && id) {
                const model = yield getOneModel();
                let newModel = Object.assign({}, model, request.bodyJson(this.readonlyProperties('PUT')));
                newModel = yield ModelClass.save(newModel, { userSideValidation: true });
                return newModel;
            }
            if (request.method === 'DELETE' && id) {
                const model = yield getOneModel();
                yield ModelClass.delete(model.id);
                return;
            }
            if (request.method === 'POST') {
                const props = this.readonlyProperties('POST');
                const idIdx = props.indexOf('id');
                if (idIdx >= 0)
                    props.splice(idIdx, 1);
                const model = request.bodyJson(props);
                const result = yield ModelClass.save(model, this.defaultSaveOptions_(model, 'POST'));
                return result;
            }
            throw new ErrorMethodNotAllowed();
        });
    }
    action_ping(request) {
        return __awaiter(this, void 0, void 0, function* () {
            if (request.method === 'GET') {
                return 'JoplinClipperServer';
            }
            throw new ErrorMethodNotAllowed();
        });
    }
    action_search(request) {
        return __awaiter(this, void 0, void 0, function* () {
            this.checkToken_(request);
            if (request.method !== 'GET')
                throw new ErrorMethodNotAllowed();
            const query = request.query.query;
            if (!query)
                throw new ErrorBadRequest('Missing "query" parameter');
            const queryType = request.query.type ? BaseModel.modelNameToType(request.query.type) : BaseModel.TYPE_NOTE;
            if (queryType !== BaseItem.TYPE_NOTE) {
                const ModelClass = BaseItem.getClassByItemType(queryType);
                const options = {};
                const fields = this.fields_(request, []);
                if (fields.length)
                    options.fields = fields;
                const sqlQueryPart = query.replace(/\*/g, '%');
                options.where = 'title LIKE ?';
                options.whereParams = [sqlQueryPart];
                options.caseInsensitive = true;
                return yield ModelClass.all(options);
            }
            else {
                return yield SearchEngineUtils.notesForQuery(query, this.notePreviewsOptions_(request));
            }
        });
    }
    action_folders(request, id = null, link = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (request.method === 'GET' && !id) {
                const folders = yield FoldersScreenUtils.allForDisplay({ fields: this.fields_(request, ['id', 'parent_id', 'title']) });
                const output = yield Folder.allAsTree(folders);
                return output;
            }
            if (request.method === 'GET' && id) {
                if (link && link === 'notes') {
                    const options = this.notePreviewsOptions_(request);
                    return Note.previews(id, options);
                }
                else if (link) {
                    throw new ErrorNotFound();
                }
            }
            return this.defaultAction_(BaseModel.TYPE_FOLDER, request, id, link);
        });
    }
    action_tags(request, id = null, link = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (link === 'notes') {
                const tag = yield Tag.load(id);
                if (!tag)
                    throw new ErrorNotFound();
                if (request.method === 'POST') {
                    const note = request.bodyJson();
                    if (!note || !note.id)
                        throw new ErrorBadRequest('Missing note ID');
                    return yield Tag.addNote(tag.id, note.id);
                }
                if (request.method === 'DELETE') {
                    const noteId = request.params.length ? request.params[0] : null;
                    if (!noteId)
                        throw new ErrorBadRequest('Missing note ID');
                    yield Tag.removeNote(tag.id, noteId);
                    return;
                }
                if (request.method === 'GET') {
                    // Ideally we should get all this in one SQL query but for now that will do
                    const noteIds = yield Tag.noteIds(tag.id);
                    const output = [];
                    for (let i = 0; i < noteIds.length; i++) {
                        const n = yield Note.preview(noteIds[i], this.notePreviewsOptions_(request));
                        if (!n)
                            continue;
                        output.push(n);
                    }
                    return output;
                }
            }
            return this.defaultAction_(BaseModel.TYPE_TAG, request, id, link);
        });
    }
    action_master_keys(request, id = null, link = null) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.defaultAction_(BaseModel.TYPE_MASTER_KEY, request, id, link);
        });
    }
    action_resources(request, id = null, link = null) {
        return __awaiter(this, void 0, void 0, function* () {
            // fieldName: "data"
            // headers: Object
            // originalFilename: "test.jpg"
            // path: "C:\Users\Laurent\AppData\Local\Temp\BW77wkpP23iIGUstd0kDuXXC.jpg"
            // size: 164394
            if (request.method === 'GET') {
                if (link === 'file') {
                    const resource = yield Resource.load(id);
                    if (!resource)
                        throw new ErrorNotFound();
                    const filePath = Resource.fullPath(resource);
                    const buffer = yield shim_1.default.fsDriver().readFile(filePath, 'Buffer');
                    const response = new ApiResponse();
                    response.type = 'attachment';
                    response.body = buffer;
                    response.contentType = resource.mime;
                    response.attachmentFilename = Resource.friendlyFilename(resource);
                    return response;
                }
                if (link)
                    throw new ErrorNotFound();
            }
            if (request.method === 'POST') {
                if (!request.files.length)
                    throw new ErrorBadRequest('Resource cannot be created without a file');
                const filePath = request.files[0].path;
                const defaultProps = request.bodyJson(this.readonlyProperties('POST'));
                return shim_1.default.createResourceFromPath(filePath, defaultProps, { userSideValidation: true });
            }
            return this.defaultAction_(BaseModel.TYPE_RESOURCE, request, id, link);
        });
    }
    notePreviewsOptions_(request) {
        const fields = this.fields_(request, []); // previews() already returns default fields
        const options = {};
        if (fields.length)
            options.fields = fields;
        return options;
    }
    defaultSaveOptions_(model, requestMethod) {
        const options = { userSideValidation: true };
        if (requestMethod === 'POST' && model.id)
            options.isNew = true;
        return options;
    }
    defaultLoadOptions_(request) {
        const options = {};
        const fields = this.fields_(request, []);
        if (fields.length)
            options.fields = fields;
        return options;
    }
    execServiceActionFromRequest_(externalApi, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const action = externalApi[request.action];
            if (!action)
                throw new ErrorNotFound(`Invalid action: ${request.action}`);
            const args = Object.assign({}, request);
            delete args.action;
            return action(args);
        });
    }
    action_services(request, serviceName) {
        return __awaiter(this, void 0, void 0, function* () {
            this.checkToken_(request);
            if (request.method !== 'POST')
                throw new ErrorMethodNotAllowed();
            if (!this.actionApi_)
                throw new ErrorNotFound('No action API has been setup!');
            if (!this.actionApi_[serviceName])
                throw new ErrorNotFound(`No such service: ${serviceName}`);
            const externalApi = this.actionApi_[serviceName]();
            return this.execServiceActionFromRequest_(externalApi, JSON.parse(request.body));
        });
    }
    action_notes(request, id = null, link = null) {
        return __awaiter(this, void 0, void 0, function* () {
            this.checkToken_(request);
            if (request.method === 'GET') {
                if (link && link === 'tags') {
                    return Tag.tagsByNoteId(id);
                }
                else if (link && link === 'resources') {
                    const note = yield Note.load(id);
                    if (!note)
                        throw new ErrorNotFound();
                    const resourceIds = yield Note.linkedResourceIds(note.body);
                    const output = [];
                    const loadOptions = this.defaultLoadOptions_(request);
                    for (const resourceId of resourceIds) {
                        output.push(yield Resource.load(resourceId, loadOptions));
                    }
                    return output;
                }
                else if (link) {
                    throw new ErrorNotFound();
                }
                const options = this.notePreviewsOptions_(request);
                if (id) {
                    return yield Note.preview(id, options);
                }
                else {
                    return yield Note.previews(null, options);
                }
            }
            if (request.method === 'POST') {
                const requestId = Date.now();
                const requestNote = JSON.parse(request.body);
                //const allowFileProtocolImages = urlUtils.urlProtocol(requestNote.base_url).toLowerCase() === 'file:';
                const imageSizes = requestNote.image_sizes ? requestNote.image_sizes : {};
                let note = yield this.requestNoteToNote_(requestNote);
                const imageUrls = ArrayUtils.unique(markupLanguageUtils.extractImageUrls(note.markup_language, note.body));
                this.logger().info(`Request (${requestId}): Downloading images: ${imageUrls.length}`);
                let result = yield this.downloadImages_(imageUrls); //, allowFileProtocolImages);
                this.logger().info(`Request (${requestId}): Creating resources from paths: ${Object.getOwnPropertyNames(result).length}`);
                result = yield this.createResourcesFromPaths_(result);
                yield this.removeTempFiles_(result);
                note.body = this.replaceImageUrlsByResources_(note.markup_language, note.body, result, imageSizes);
                this.logger().info(`Request (${requestId}): Saving note...`);
                const saveOptions = this.defaultSaveOptions_(note, 'POST');
                saveOptions.autoTimestamp = false; // No auto-timestamp because user may have provided them
                const timestamp = Date.now();
                note.updated_time = timestamp;
                note.created_time = timestamp;
                note = yield Note.save(note, saveOptions);
                if (requestNote.tags) {
                    const tagTitles = requestNote.tags.split(',');
                    yield Tag.setNoteTagsByTitles(note.id, tagTitles);
                }
                if (requestNote.image_data_url) {
                    note = yield this.attachImageFromDataUrl_(note, requestNote.image_data_url, requestNote.crop_rect);
                }
                this.logger().info(`Request (${requestId}): Created note ${note.id}`);
                return note;
            }
            if (request.method === 'PUT') {
                const note = yield Note.load(id);
                if (!note)
                    throw new ErrorNotFound();
                const updatedNote = yield this.defaultAction_(BaseModel.TYPE_NOTE, request, id, link);
                const requestNote = JSON.parse(request.body);
                if (requestNote.tags || requestNote.tags === '') {
                    const tagTitles = requestNote.tags.split(',');
                    yield Tag.setNoteTagsByTitles(id, tagTitles);
                }
                return updatedNote;
            }
            return this.defaultAction_(BaseModel.TYPE_NOTE, request, id, link);
        });
    }
    // ========================================================================================================================
    // UTILIY FUNCTIONS
    // ========================================================================================================================
    htmlToMdParser() {
        if (this.htmlToMdParser_)
            return this.htmlToMdParser_;
        this.htmlToMdParser_ = new HtmlToMd();
        return this.htmlToMdParser_;
    }
    requestNoteToNote_(requestNote) {
        return __awaiter(this, void 0, void 0, function* () {
            const output = {
                title: requestNote.title ? requestNote.title : '',
                body: requestNote.body ? requestNote.body : '',
            };
            if (requestNote.id)
                output.id = requestNote.id;
            const baseUrl = requestNote.base_url ? requestNote.base_url : '';
            if (requestNote.body_html) {
                if (requestNote.convert_to === 'html') {
                    const style = yield this.buildNoteStyleSheet_(requestNote.stylesheets);
                    const minify = require('html-minifier').minify;
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
                        minifiedHtml = minify(requestNote.body_html, minifyOptions);
                    }
                    catch (error) {
                        console.warn('Could not minify HTML - using non-minified HTML instead', error);
                        minifiedHtml = requestNote.body_html;
                    }
                    output.body = styleTag + minifiedHtml;
                    output.body = htmlUtils.prependBaseUrl(output.body, baseUrl);
                    output.markup_language = MarkupToHtml.MARKUP_LANGUAGE_HTML;
                }
                else {
                    // Convert to Markdown
                    // Parsing will not work if the HTML is not wrapped in a top level tag, which is not guaranteed
                    // when getting the content from elsewhere. So here wrap it - it won't change anything to the final
                    // rendering but it makes sure everything will be parsed.
                    output.body = yield this.htmlToMdParser().parse(`<div>${requestNote.body_html}</div>`, {
                        baseUrl: baseUrl,
                        anchorNames: requestNote.anchor_names ? requestNote.anchor_names : [],
                    });
                    output.markup_language = MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN;
                }
            }
            if (requestNote.parent_id) {
                output.parent_id = requestNote.parent_id;
            }
            else {
                const folder = yield Folder.defaultFolder();
                if (!folder)
                    throw new Error('Cannot find folder for note');
                output.parent_id = folder.id;
            }
            if ('source_url' in requestNote)
                output.source_url = requestNote.source_url;
            if ('author' in requestNote)
                output.author = requestNote.author;
            if ('user_updated_time' in requestNote)
                output.user_updated_time = Database.formatValue(Database.TYPE_INT, requestNote.user_updated_time);
            if ('user_created_time' in requestNote)
                output.user_created_time = Database.formatValue(Database.TYPE_INT, requestNote.user_created_time);
            if ('is_todo' in requestNote)
                output.is_todo = Database.formatValue(Database.TYPE_INT, requestNote.is_todo);
            if ('markup_language' in requestNote)
                output.markup_language = Database.formatValue(Database.TYPE_INT, requestNote.markup_language);
            if (!output.markup_language)
                output.markup_language = MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN;
            return output;
        });
    }
    // Note must have been saved first
    attachImageFromDataUrl_(note, imageDataUrl, cropRect) {
        return __awaiter(this, void 0, void 0, function* () {
            const tempDir = Setting_1.default.value('tempDir');
            const mime = mimeUtils.fromDataUrl(imageDataUrl);
            let ext = mimeUtils.toFileExtension(mime) || '';
            if (ext)
                ext = `.${ext}`;
            const tempFilePath = `${tempDir}/${md5(`${Math.random()}_${Date.now()}`)}${ext}`;
            const imageConvOptions = {};
            if (cropRect)
                imageConvOptions.cropRect = cropRect;
            yield shim_1.default.imageFromDataUrl(imageDataUrl, tempFilePath, imageConvOptions);
            return yield shim_1.default.attachFileToNote(note, tempFilePath);
        });
    }
    tryToGuessImageExtFromMimeType_(response, imagePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const mimeType = netUtils.mimeTypeFromHeaders(response.headers);
            if (!mimeType)
                return imagePath;
            const newExt = mimeUtils.toFileExtension(mimeType);
            if (!newExt)
                return imagePath;
            const newImagePath = `${imagePath}.${newExt}`;
            yield shim_1.default.fsDriver().move(imagePath, newImagePath);
            return newImagePath;
        });
    }
    buildNoteStyleSheet_(stylesheets) {
        return __awaiter(this, void 0, void 0, function* () {
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
                        yield shim_1.default.fetchBlob(stylesheet.value, { path: tempPath, maxRetry: 1 });
                        const text = yield shim_1.default.fsDriver().readFile(tempPath);
                        output.push(text);
                        yield shim_1.default.fsDriver().remove(tempPath);
                    }
                    catch (error) {
                        this.logger().warn(`Cannot download stylesheet at ${stylesheet.value}`, error);
                    }
                }
                else {
                    throw new Error(`Invalid stylesheet type: ${stylesheet.type}`);
                }
            }
            return output;
        });
    }
    downloadImage_(url /* , allowFileProtocolImages */) {
        return __awaiter(this, void 0, void 0, function* () {
            const tempDir = Setting_1.default.value('tempDir');
            const isDataUrl = url && url.toLowerCase().indexOf('data:') === 0;
            const name = isDataUrl ? md5(`${Math.random()}_${Date.now()}`) : filename(url);
            let fileExt = isDataUrl ? mimeUtils.toFileExtension(mimeUtils.fromDataUrl(url)) : safeFileExtension(fileExtension(url).toLowerCase());
            if (!mimeUtils.fromFileExtension(fileExt))
                fileExt = ''; // If the file extension is unknown - clear it.
            if (fileExt)
                fileExt = `.${fileExt}`;
            // Append a UUID because simply checking if the file exists is not enough since
            // multiple resources can be downloaded at the same time (race condition).
            let imagePath = `${tempDir}/${safeFilename(name)}_${uuid_1.default.create()}${fileExt}`;
            try {
                if (isDataUrl) {
                    yield shim_1.default.imageFromDataUrl(url, imagePath);
                }
                else if (urlUtils.urlProtocol(url).toLowerCase() === 'file:') {
                    // Can't think of any reason to disallow this at this point
                    // if (!allowFileProtocolImages) throw new Error('For security reasons, this URL with file:// protocol cannot be downloaded');
                    const localPath = uri2path(url);
                    yield shim_1.default.fsDriver().copy(localPath, imagePath);
                }
                else {
                    const response = yield shim_1.default.fetchBlob(url, { path: imagePath, maxRetry: 1 });
                    // If we could not find the file extension from the URL, try to get it
                    // now based on the Content-Type header.
                    if (!fileExt)
                        imagePath = yield this.tryToGuessImageExtFromMimeType_(response, imagePath);
                }
                return imagePath;
            }
            catch (error) {
                this.logger().warn(`Cannot download image at ${url}`, error);
                return '';
            }
        });
    }
    downloadImages_(urls /*, allowFileProtocolImages:boolean */) {
        return __awaiter(this, void 0, void 0, function* () {
            const PromisePool = require('es6-promise-pool');
            const output = {};
            const downloadOne = (url) => __awaiter(this, void 0, void 0, function* () {
                const imagePath = yield this.downloadImage_(url); //, allowFileProtocolImages);
                if (imagePath)
                    output[url] = { path: imagePath, originalUrl: url };
            });
            let urlIndex = 0;
            const promiseProducer = () => {
                if (urlIndex >= urls.length)
                    return null;
                const url = urls[urlIndex++];
                return downloadOne(url);
            };
            const concurrency = 10;
            const pool = new PromisePool(promiseProducer, concurrency);
            yield pool.start();
            return output;
        });
    }
    createResourcesFromPaths_(urls) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const url in urls) {
                if (!urls.hasOwnProperty(url))
                    continue;
                const urlInfo = urls[url];
                try {
                    const resource = yield shim_1.default.createResourceFromPath(urlInfo.path);
                    urlInfo.resource = resource;
                }
                catch (error) {
                    this.logger().warn(`Cannot create resource for ${url}`, error);
                }
            }
            return urls;
        });
    }
    removeTempFiles_(urls) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const url in urls) {
                if (!urls.hasOwnProperty(url))
                    continue;
                const urlInfo = urls[url];
                try {
                    yield shim_1.default.fsDriver().remove(urlInfo.path);
                }
                catch (error) {
                    this.logger().warn(`Cannot remove ${urlInfo.path}`, error);
                }
            }
        });
    }
    replaceImageUrlsByResources_(markupLanguage, md, urls, imageSizes) {
        const imageSizesIndexes = {};
        if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_HTML) {
            return htmlUtils.replaceImageUrls(md, (imageUrl) => {
                const urlInfo = urls[imageUrl];
                if (!urlInfo || !urlInfo.resource)
                    return imageUrl;
                return Resource.internalUrl(urlInfo.resource);
            });
        }
        else {
            // eslint-disable-next-line no-useless-escape
            return md.replace(/(!\[.*?\]\()([^\s\)]+)(.*?\))/g, (_match, before, imageUrl, after) => {
                const urlInfo = urls[imageUrl];
                if (!urlInfo || !urlInfo.resource)
                    return before + imageUrl + after;
                if (!(urlInfo.originalUrl in imageSizesIndexes))
                    imageSizesIndexes[urlInfo.originalUrl] = 0;
                const resourceUrl = Resource.internalUrl(urlInfo.resource);
                const imageSizesCollection = imageSizes[urlInfo.originalUrl];
                if (!imageSizesCollection) {
                    // In some cases, we won't find the image size information for that particular URL. Normally
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
}
exports.default = Api;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXBpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXlDO0FBQ3pDLHVDQUFnQztBQUNoQyxtQ0FBNEI7QUFDNUIsbUNBQTRCO0FBRTVCLE1BQU0sRUFBRSxZQUFZLEVBQUUsR0FBRyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUN0RCxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDaEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDNUMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDeEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDdEMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDaEQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDaEQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzNDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUMzQyxNQUFNLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBQy9ELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNwRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDM0IsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3pDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQzVDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ2hE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