"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const InteropService_Importer_Base_1 = require("./InteropService_Importer_Base");
const path_utils_1 = require("../../path-utils");
const InteropService_Importer_Md_1 = require("./InteropService_Importer_Md");
const path_1 = require("path");
const Logger_1 = require("@joplin/utils/Logger");
const uuid_1 = require("../../uuid");
const shim_1 = require("../../shim");
const logger = Logger_1.default.create('InteropService_Importer_OneNote');
// See onenote-converter README.md for more information
class InteropService_Importer_OneNote extends InteropService_Importer_Base_1.default {
    constructor() {
        super(...arguments);
        this.importedNotes = {};
        this.domParser = null;
        this.xmlSerializer = null;
    }
    async init(sourcePath, options) {
        await super.init(sourcePath, options);
        if (!options.domParser || !options.xmlSerializer) {
            throw new Error('OneNote importer requires DOMParser and XMLSerializer to be able to extract SVG from HTML.');
        }
        this.domParser = options.domParser;
        this.xmlSerializer = options.xmlSerializer;
    }
    getEntryDirectory(unzippedPath, entryName) {
        const withoutBasePath = entryName.replace(unzippedPath, '');
        return (0, path_1.normalize)(withoutBasePath).split(path_1.sep)[0];
    }
    async extractFiles_(sourcePath, targetPath) {
        const fileExtension = (0, path_1.extname)(sourcePath).toLowerCase();
        const fileNameNoExtension = (0, path_1.basename)(sourcePath, (0, path_1.extname)(sourcePath));
        if (fileExtension === '.zip') {
            logger.info('Unzipping files...');
            await shim_1.default.fsDriver().zipExtract({ source: sourcePath, extractTo: targetPath });
        }
        else if (fileExtension === '.one') {
            logger.info('Copying file...');
            const outputDirectory = (0, path_1.join)(targetPath, fileNameNoExtension);
            await shim_1.default.fsDriver().mkdir(outputDirectory);
            await shim_1.default.fsDriver().copy(sourcePath, (0, path_1.join)(outputDirectory, (0, path_1.basename)(sourcePath)));
        }
        else if (fileExtension === '.onepkg') {
            // Change the file extension so that the archive can be extracted
            const archivePath = (0, path_1.join)(targetPath, `${fileNameNoExtension}.cab`);
            await shim_1.default.fsDriver().copy(sourcePath, archivePath);
            const extractPath = (0, path_1.join)(targetPath, fileNameNoExtension);
            await shim_1.default.fsDriver().mkdir(extractPath);
            await shim_1.default.fsDriver().cabExtract({
                source: archivePath,
                extractTo: extractPath,
                // Only the .one files are used--there's no need to extract
                // other files.
                fileNamePattern: '*.one',
            });
        }
        else {
            throw new Error(`Unknown file extension: ${fileExtension}`);
        }
        return await shim_1.default.fsDriver().readDirStats(targetPath, { recursive: true });
    }
    async execImpl_(result, unzipTempDirectory, tempOutputDirectory) {
        var _a, _b, _c, _d;
        const sourcePath = (0, path_utils_1.rtrimSlashes)(this.sourcePath_);
        const files = await this.extractFiles_(sourcePath, unzipTempDirectory);
        if (files.length === 0) {
            result.warnings.push('Zip file has no files.');
            return result;
        }
        const baseFolder = this.getEntryDirectory(unzipTempDirectory, files[0].path);
        const notebookBaseDir = (0, path_1.join)(unzipTempDirectory, baseFolder, path_1.sep);
        const outputDirectory2 = (0, path_1.join)(tempOutputDirectory, baseFolder);
        const notebookFiles = files.filter(e => {
            return (0, path_1.extname)(e.path) !== '.onetoc2' && (0, path_1.basename)(e.path) !== 'OneNote_RecycleBin.onetoc2';
        });
        const { oneNoteConverter } = shim_1.default.requireDynamic('@joplin/onenote-converter');
        logger.info('Extracting OneNote to HTML');
        const skippedFiles = [];
        for (const notebookFile of notebookFiles) {
            const notebookFilePath = (0, path_1.join)(unzipTempDirectory, notebookFile.path);
            // In some cases, the OneNote zip file can include folders and other files
            // that shouldn't be imported directly. Skip these:
            if (!['.one', '.onetoc2'].includes((0, path_1.extname)(notebookFilePath).toLowerCase())) {
                logger.info('Skipping non-OneNote file:', notebookFile.path);
                skippedFiles.push(notebookFile.path);
                continue;
            }
            try {
                await oneNoteConverter(notebookFilePath, (0, path_1.resolve)(outputDirectory2), notebookBaseDir);
            }
            catch (error) {
                (_b = (_a = this.options_).onError) === null || _b === void 0 ? void 0 : _b.call(_a, error);
                console.error(error);
            }
        }
        if (skippedFiles.length === notebookFiles.length) {
            (_d = (_c = this.options_).onError) === null || _d === void 0 ? void 0 : _d.call(_c, new Error(`None of the files appear to be from OneNote. Skipped files include: ${JSON.stringify(skippedFiles)}`));
        }
        logger.info('Extracting SVGs into files');
        await this.moveSvgToLocalFile(tempOutputDirectory);
        logger.info('Importing HTML into Joplin');
        const importer = new InteropService_Importer_Md_1.default();
        importer.setMetadata({ fileExtensions: ['html'] });
        await importer.init(tempOutputDirectory, Object.assign(Object.assign({}, this.options_), { format: 'html', outputFormat: types_1.ImportModuleOutputFormat.Html }));
        logger.info('Finished');
        result = await importer.exec(result);
        return result;
    }
    async exec(result) {
        const unzipTempDirectory = await this.temporaryDirectory_(true);
        const tempOutputDirectory = await this.temporaryDirectory_(true);
        try {
            return await this.execImpl_(result, unzipTempDirectory, tempOutputDirectory);
        }
        finally {
            await shim_1.default.fsDriver().remove(unzipTempDirectory);
            await shim_1.default.fsDriver().remove(tempOutputDirectory);
        }
    }
    async moveSvgToLocalFile(baseFolder) {
        const htmlFiles = await this.getValidHtmlFiles((0, path_1.resolve)(baseFolder));
        for (const file of htmlFiles) {
            const fileLocation = (0, path_1.join)(baseFolder, file.path);
            const originalHtml = await shim_1.default.fsDriver().readFile(fileLocation);
            const { svgs, html: updatedHtml } = this.extractSvgs(originalHtml, () => (0, uuid_1.uuidgen)(10));
            if (!svgs || !svgs.length)
                continue;
            await shim_1.default.fsDriver().writeFile(fileLocation, updatedHtml, 'utf8');
            await this.createSvgFiles(svgs, (0, path_1.join)(baseFolder, (0, path_1.dirname)(file.path)));
        }
    }
    async getValidHtmlFiles(baseFolder) {
        const files = await shim_1.default.fsDriver().readDirStats(baseFolder, { recursive: true });
        const htmlFiles = files.filter(f => !f.isDirectory() && f.path.endsWith('.html'));
        return htmlFiles;
    }
    async createSvgFiles(svgs, svgBaseFolder) {
        for (const svg of svgs) {
            await shim_1.default.fsDriver().writeFile((0, path_1.join)(svgBaseFolder, svg.title), svg.content, 'utf8');
        }
    }
    extractSvgs(html, titleGenerator) {
        const dom = this.domParser.parseFromString(html, 'text/html');
        // get all "top-level" SVGS (ignore nested)
        const svgNodeList = dom.querySelectorAll('svg');
        if (!svgNodeList || !svgNodeList.length) {
            return { svgs: [], html };
        }
        const svgs = [];
        for (const svgNode of svgNodeList) {
            const img = dom.createElement('img');
            if (svgNode.hasAttribute('style')) {
                img.setAttribute('style', svgNode.getAttribute('style'));
                svgNode.removeAttribute('style');
            }
            for (const entry of svgNode.classList) {
                img.classList.add(entry);
            }
            if (svgNode.hasAttribute('style')) {
                img.setAttribute('style', svgNode.getAttribute('style'));
                svgNode.removeAttribute('style');
            }
            // A11Y: Translate SVG titles to ALT text
            // See https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/title
            const titleElement = svgNode.querySelector('title');
            if (titleElement) {
                img.alt = titleElement.textContent;
            }
            const title = `${titleGenerator()}.svg`;
            img.setAttribute('src', `./${title}`);
            svgs.push({
                title,
                content: this.xmlSerializer.serializeToString(svgNode),
            });
            svgNode.replaceWith(img);
        }
        return {
            svgs,
            // Don't use xmlSerializer here: It breaks <style> blocks.
            html: `<!DOCTYPE HTML>\n${dom.documentElement.outerHTML}`,
        };
    }
}
exports.default = InteropService_Importer_OneNote;
