"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InteropService_Exporter_Base_1 = require("./InteropService_Exporter_Base");
const BaseModel_1 = require("../../BaseModel");
const shim_1 = require("../../shim");
const markupLanguageUtils_1 = require("../../markupLanguageUtils");
const Folder_1 = require("../../models/Folder");
const Note_1 = require("../../models/Note");
const Setting_1 = require("../../models/Setting");
const loadContentScripts_1 = require("../plugins/utils/loadContentScripts");
const path_utils_1 = require("../../path-utils");
const packToString_1 = require("@joplin/htmlpack/packToString");
const { themeStyle } = require('../../theme');
const { escapeHtml } = require('../../string-utils.js');
const renderer_1 = require("@joplin/renderer");
const getPluginSettingValue_1 = require("../plugins/utils/getPluginSettingValue");
const MdToHtml_1 = require("@joplin/renderer/MdToHtml");
const Logger_1 = require("@joplin/utils/Logger");
const utils_1 = require("./utils");
const ResourceLocalState_1 = require("../../models/ResourceLocalState");
const mime_utils_1 = require("../../mime-utils");
const logger = Logger_1.default.create('InteropService_Exporter_Html');
class InteropService_Exporter_Html extends InteropService_Exporter_Base_1.default {
    constructor() {
        super(...arguments);
        this.createdDirs_ = [];
        this.resources_ = {};
        this.packIntoSingleFile_ = false;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async init(path, options = {}) {
        this.customCss_ = options.customCss ? options.customCss : '';
        if (this.metadata().target === 'file') {
            this.destDir_ = (0, path_utils_1.dirname)(path);
            this.filePath_ = path;
            this.packIntoSingleFile_ = 'packIntoSingleFile' in options ? options.packIntoSingleFile : true;
        }
        else {
            this.destDir_ = path;
            this.filePath_ = null;
        }
        this.resourceDir_ = this.destDir_ ? `${this.destDir_}/_resources` : null;
        await shim_1.default.fsDriver().mkdir(this.destDir_);
        this.markupToHtml_ = markupLanguageUtils_1.default.newMarkupToHtml(null, {
            extraRendererRules: (0, loadContentScripts_1.contentScriptsToRendererRules)(options.plugins),
            customCss: this.customCss_ || '',
        });
        this.style_ = themeStyle(Setting_1.default.THEME_LIGHT);
    }
    async makeDirPath_(item, pathPart = null) {
        let output = '';
        while (true) {
            if (item.type_ === BaseModel_1.default.TYPE_FOLDER) {
                if (pathPart) {
                    output = `${pathPart}/${output}`;
                }
                else {
                    output = `${(0, path_utils_1.friendlySafeFilename)(item.title)}/${output}`;
                    output = await shim_1.default.fsDriver().findUniqueFilename(output);
                }
            }
            if (!item.parent_id)
                return output;
            item = await Folder_1.default.load(item.parent_id);
        }
    }
    async processNoteResources_(item) {
        const target = this.metadata().target;
        const linkedResourceIds = await Note_1.default.linkedResourceIds(item.body);
        const relativePath = target === 'directory' ? (0, path_utils_1.rtrimSlashes)(await this.makeDirPath_(item, '..')) : '';
        const resourcePaths = this.context() && this.context().resourcePaths ? this.context().resourcePaths : {};
        let newBody = item.body;
        for (let i = 0; i < linkedResourceIds.length; i++) {
            const id = linkedResourceIds[i];
            // Skip the resources which haven't been downloaded yet
            if (!resourcePaths[id]) {
                continue;
            }
            const resourceContent = `${relativePath ? `${relativePath}/` : ''}_resources/${(0, path_utils_1.basename)(resourcePaths[id])}`;
            newBody = newBody.replace(new RegExp(`:/${id}`, 'g'), resourceContent);
        }
        return newBody;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async processItem(_itemType, item) {
        if ([BaseModel_1.default.TYPE_NOTE, BaseModel_1.default.TYPE_FOLDER].indexOf(item.type_) < 0)
            return;
        let dirPath = '';
        if (!this.filePath_) {
            dirPath = `${this.destDir_}/${await this.makeDirPath_(item)}`;
            if (this.createdDirs_.indexOf(dirPath) < 0) {
                await shim_1.default.fsDriver().mkdir(dirPath);
                this.createdDirs_.push(dirPath);
            }
        }
        if (item.type_ === BaseModel_1.default.TYPE_NOTE) {
            let noteFilePath = '';
            if (this.filePath_) {
                noteFilePath = this.filePath_;
            }
            else {
                noteFilePath = `${dirPath}/${(0, path_utils_1.friendlySafeFilename)(item.title)}.html`;
                noteFilePath = await shim_1.default.fsDriver().findUniqueFilename(noteFilePath);
            }
            const bodyMd = await this.processNoteResources_(item);
            const result = await this.markupToHtml_.render(item.markup_language, bodyMd, this.style_, {
                resources: this.resources_,
                settingValue: getPluginSettingValue_1.default,
                plainResourceRendering: true,
                plugins: {
                    link_open: {
                        linkRenderingType: MdToHtml_1.LinkRenderingType.HrefHandler,
                    },
                },
            });
            const noteContent = [];
            const metadata = (0, utils_1.parseRenderedNoteMetadata)(result.html ? result.html : '');
            if (!metadata.printTitle)
                logger.info('Not printing title because joplin-metadata-print-title tag is set to false');
            if (metadata.printTitle && item.title)
                noteContent.push(`<div class="exported-note-title">${escapeHtml(item.title)}</div>`);
            if (result.html)
                noteContent.push(result.html);
            // We need to export all the plugin assets too and refer them from the header
            // The source path is a bit hard-coded but shouldn't change.
            for (let i = 0; i < result.pluginAssets.length; i++) {
                const asset = result.pluginAssets[i];
                const filePath = asset.pathIsAbsolute ? asset.path : `${Setting_1.default.value('pluginAssetDir')}/${asset.name}`;
                if (!(await shim_1.default.fsDriver().exists(filePath))) {
                    logger.warn(`File does not exist and cannot be exported: ${filePath}`);
                }
                else {
                    const destPath = `${(0, path_utils_1.dirname)(noteFilePath)}/pluginAssets/${asset.name}`;
                    const dir = (0, path_utils_1.dirname)(destPath);
                    await shim_1.default.fsDriver().mkdir(dir);
                    this.createdDirs_.push(dir);
                    await shim_1.default.fsDriver().copy(filePath, destPath);
                }
            }
            const fullHtml = `
				<!DOCTYPE html>
				<html>
					<head>
						<meta charset="UTF-8">
						<meta name="viewport" content="width=device-width, initial-scale=1" />
						${(0, renderer_1.assetsToHeaders)(result.pluginAssets, { asHtml: true })}
						<title>${escapeHtml(item.title)}</title>
					</head>
					<body>
						<div class="exported-note">${noteContent.join('\n\n')}</div>
					</body>
				</html>
			`;
            await shim_1.default.fsDriver().writeFile(noteFilePath, fullHtml, 'utf-8');
        }
    }
    async processResource(resource, filePath) {
        if (!this.resourceDir_)
            return;
        if (!await shim_1.default.fsDriver().exists(this.resourceDir_)) {
            await shim_1.default.fsDriver().mkdir(this.resourceDir_);
        }
        const destResourcePath = `${this.resourceDir_}/${(0, path_utils_1.basename)(filePath)}`;
        await shim_1.default.fsDriver().copy(filePath, destResourcePath);
        const localState = await ResourceLocalState_1.default.load(resource.id);
        this.resources_[resource.id] = {
            localState,
            item: resource,
        };
    }
    async close() {
        if (this.packIntoSingleFile_) {
            const mainHtml = await shim_1.default.fsDriver().readFile(this.filePath_, 'utf8');
            const resolveToAllowedDir = (path) => {
                // TODO: Enable this for all platforms -- at present, this is mobile-only.
                const restrictToDestDir = !!shim_1.default.mobilePlatform();
                if (restrictToDestDir) {
                    return shim_1.default.fsDriver().resolveRelativePathWithinDir(this.destDir_, path);
                }
                else {
                    return shim_1.default.fsDriver().resolve(this.destDir_, path);
                }
            };
            const packedHtml = await (0, packToString_1.default)(this.destDir_, mainHtml, {
                exists: (path) => {
                    path = resolveToAllowedDir(path);
                    return shim_1.default.fsDriver().exists(path);
                },
                readFileDataUri: async (path) => {
                    path = resolveToAllowedDir(path);
                    const mimeType = (0, mime_utils_1.fromFilename)(path);
                    const content = await shim_1.default.fsDriver().readFile(path, 'base64');
                    return `data:${mimeType};base64,${content}`;
                },
                readFileText: (path) => {
                    path = resolveToAllowedDir(path);
                    return shim_1.default.fsDriver().readFile(path, 'utf8');
                },
            });
            await shim_1.default.fsDriver().writeFile(this.filePath_, packedHtml, 'utf8');
            for (const d of this.createdDirs_) {
                await shim_1.default.fsDriver().remove(d);
            }
            await shim_1.default.fsDriver().remove(this.resourceDir_);
            await shim_1.default.fsDriver().remove(`${this.destDir_}/pluginAssets`);
        }
    }
}
exports.default = InteropService_Exporter_Html;
