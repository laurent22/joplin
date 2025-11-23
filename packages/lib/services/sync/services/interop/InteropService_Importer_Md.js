"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const locale_1 = require("../../locale");
const InteropService_Importer_Base_1 = require("./InteropService_Importer_Base");
const Folder_1 = require("../../models/Folder");
const Note_1 = require("../../models/Note");
const path_utils_1 = require("../../path-utils");
const shim_1 = require("../../shim");
const markdownUtils_1 = require("../../markdownUtils");
const htmlUtils_1 = require("../../htmlUtils");
const ArrayUtils_1 = require("../../ArrayUtils");
const { pregQuote } = require('../../string-utils-common');
const renderer_1 = require("@joplin/renderer");
const url_1 = require("@joplin/utils/url");
const string_utils_1 = require("../../string-utils");
class InteropService_Importer_Md extends InteropService_Importer_Base_1.default {
    constructor() {
        super(...arguments);
        this.importedNotes = {};
    }
    async exec(result) {
        let parentFolderId = null;
        const sourcePath = (0, path_utils_1.rtrimSlashes)(this.sourcePath_);
        const filePaths = [];
        if (await shim_1.default.fsDriver().isDirectory(sourcePath)) {
            if (!this.options_.destinationFolder) {
                const folderTitle = await Folder_1.default.findUniqueItemTitle((0, path_utils_1.basename)(sourcePath));
                const folder = await Folder_1.default.save({ title: folderTitle });
                parentFolderId = folder.id;
            }
            else {
                parentFolderId = this.options_.destinationFolder.id;
            }
            await this.importDirectory(sourcePath, parentFolderId);
        }
        else {
            if (!this.options_.destinationFolder)
                throw new Error((0, locale_1._)('Please specify the notebook where the notes should be imported to.'));
            parentFolderId = this.options_.destinationFolder.id;
            filePaths.push(sourcePath);
        }
        for (let i = 0; i < filePaths.length; i++) {
            await this.importFile(filePaths[i], parentFolderId);
        }
        for (const importedLocalPath of Object.keys(this.importedNotes)) {
            const note = this.importedNotes[importedLocalPath];
            const updatedBody = await this.importLocalFiles(importedLocalPath, note.body, note.parent_id);
            const updatedNote = Object.assign(Object.assign({}, this.importedNotes[importedLocalPath]), { body: updatedBody || note.body });
            this.importedNotes[importedLocalPath] = await Note_1.default.save(updatedNote, { isNew: false, autoTimestamp: false });
        }
        return result;
    }
    async importDirectory(dirPath, parentFolderId) {
        const supportedFileExtension = this.metadata().fileExtensions;
        const stats = await shim_1.default.fsDriver().readDirStats(dirPath);
        for (let i = 0; i < stats.length; i++) {
            const stat = stats[i];
            if (stat.isDirectory()) {
                if (await this.isDirectoryEmpty(`${dirPath}/${stat.path}`)) {
                    continue;
                }
                const folderTitle = await Folder_1.default.findUniqueItemTitle((0, path_utils_1.basename)(stat.path));
                const folder = await Folder_1.default.save({ title: folderTitle, parent_id: parentFolderId });
                await this.importDirectory(`${dirPath}/${(0, path_utils_1.basename)(stat.path)}`, folder.id);
            }
            else if (supportedFileExtension.indexOf((0, path_utils_1.fileExtension)(stat.path).toLowerCase()) >= 0) {
                await this.importFile(`${dirPath}/${stat.path}`, parentFolderId);
            }
        }
    }
    async isDirectoryEmpty(dirPath) {
        const supportedFileExtension = this.metadata().fileExtensions;
        const innerStats = await shim_1.default.fsDriver().readDirStats(dirPath);
        for (let i = 0; i < innerStats.length; i++) {
            const innerStat = innerStats[i];
            if (innerStat.isDirectory()) {
                if (!(await this.isDirectoryEmpty(`${dirPath}/${innerStat.path}`))) {
                    return false;
                }
            }
            else if (supportedFileExtension.indexOf((0, path_utils_1.fileExtension)(innerStat.path).toLowerCase()) >= 0) {
                return false;
            }
        }
        return true;
    }
    trimAnchorLink(link) {
        if (link.indexOf('#') <= 0)
            return link;
        const splitted = link.split('#');
        splitted.pop();
        return splitted.join('#');
    }
    // Parse text for links, attempt to find local file, if found create Joplin resource
    // and update link accordingly.
    async importLocalFiles(filePath, md, parentFolderId) {
        let updated = md;
        const markdownLinks = markdownUtils_1.default.extractFileUrls(md);
        const htmlLinks = htmlUtils_1.default.extractFileUrls(md);
        const fileLinks = (0, ArrayUtils_1.unique)(markdownLinks.concat(htmlLinks));
        for (const encodedLink of fileLinks) {
            let link = '';
            try {
                link = decodeURI(encodedLink);
            }
            catch (error) {
                // If the URI cannot be decoded, leave it as it is.
                continue;
            }
            if ((0, url_1.isDataUrl)(link)) {
                // Just leave it as it is. We could potentially import
                // it as a resource but for now that's good enough.
                continue;
            }
            else {
                // Handle anchor links appropriately
                const linkPosix = (0, path_utils_1.toForwardSlashes)(link);
                const trimmedLink = this.trimAnchorLink(linkPosix);
                const pathWithExtension = shim_1.default.fsDriver().resolve(`${(0, path_utils_1.dirname)(filePath)}/${trimmedLink}`);
                const stat = await shim_1.default.fsDriver().stat(pathWithExtension);
                const isDir = stat ? stat.isDirectory() : false;
                if (stat && !isDir) {
                    const supportedFileExtension = this.metadata().fileExtensions;
                    const resolvedPath = shim_1.default.fsDriver().resolve(pathWithExtension);
                    let id = '';
                    // If the link looks like a note, then import it
                    if (supportedFileExtension.indexOf((0, path_utils_1.fileExtension)(trimmedLink).toLowerCase()) >= 0) {
                        // If the note hasn't been imported yet, do so now
                        if (!this.importedNotes[resolvedPath]) {
                            await this.importFile(resolvedPath, parentFolderId);
                        }
                        id = this.importedNotes[resolvedPath].id;
                    }
                    else {
                        const resource = await shim_1.default.createResourceFromPath(pathWithExtension, null, { resizeLargeImages: 'never' });
                        id = resource.id;
                    }
                    // The first is a normal link, the second is supports the <link> and [](<link with spaces>) syntax
                    // Only opening patterns are consider in order to cover all occurrences
                    // We need to use the encoded link as well because some links (link's with spaces)
                    // will appear encoded in the source. Other links (unicode chars) will not
                    const linksToReplace = [this.trimAnchorLink(link), this.trimAnchorLink(encodedLink)];
                    for (let j = 0; j < linksToReplace.length; j++) {
                        const linkToReplace = pregQuote(linksToReplace[j]);
                        // Markdown links
                        updated = markdownUtils_1.default.replaceResourceUrl(updated, linkToReplace, id);
                        // HTML links
                        updated = htmlUtils_1.default.replaceResourceUrl(updated, linkToReplace, id);
                    }
                }
            }
        }
        return updated;
    }
    async importFile(filePath, parentFolderId) {
        const resolvedPath = shim_1.default.fsDriver().resolve(filePath);
        if (this.importedNotes[resolvedPath])
            return this.importedNotes[resolvedPath];
        const stat = await shim_1.default.fsDriver().stat(resolvedPath);
        if (!stat)
            throw new Error(`Cannot read ${resolvedPath}`);
        const ext = (0, path_utils_1.fileExtension)(resolvedPath);
        const title = (0, path_utils_1.filename)(resolvedPath);
        const body = (0, string_utils_1.stripBom)(await shim_1.default.fsDriver().readFile(resolvedPath));
        const fixedBody = this.applyImportFixes(body);
        const note = {
            parent_id: parentFolderId,
            title: title,
            body: fixedBody,
            updated_time: stat.mtime.getTime(),
            created_time: stat.birthtime.getTime(),
            user_updated_time: stat.mtime.getTime(),
            user_created_time: stat.birthtime.getTime(),
            markup_language: ext === 'html' ? renderer_1.MarkupToHtml.MARKUP_LANGUAGE_HTML : renderer_1.MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN,
        };
        this.importedNotes[resolvedPath] = await Note_1.default.save(note, { autoTimestamp: false });
        return this.importedNotes[resolvedPath];
    }
    applyImportFixes(body) {
        const edgeCases = [
            // https://github.com/laurent22/joplin/issues/12363
            // Necessary to clean up self-closing anchor tag always present in the start of the export generate by YinXiang.
            { findPattern: /^<a\b(.*)\/>$/m, replaceWith: '<a$1></a>' },
        ];
        return edgeCases.reduce((modifiedBody, edgeCase) => {
            return modifiedBody.replace(edgeCase.findPattern, edgeCase.replaceWith);
        }, body);
    }
}
exports.default = InteropService_Importer_Md;
