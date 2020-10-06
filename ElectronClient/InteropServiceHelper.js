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
const InteropService_1 = require("lib/services/interop/InteropService");
const CommandService_1 = require("lib/services/CommandService");
const shim_1 = require("lib/shim");
const types_1 = require("lib/services/interop/types");
const { _ } = require('lib/locale');
const bridge = require('electron').remote.require('./bridge').default;
const Setting = require('lib/models/Setting').default;
const Note = require('lib/models/Note.js');
const { friendlySafeFilename } = require('lib/path-utils');
const { time } = require('lib/time-utils.js');
const md5 = require('md5');
const url = require('url');
class InteropServiceHelper {
    static exportNoteToHtmlFile(noteId, exportOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const tempFile = `${Setting.value('tempDir')}/${md5(Date.now() + Math.random())}.html`;
            const fullExportOptions = Object.assign({}, {
                path: tempFile,
                format: 'html',
                target: types_1.FileSystemItem.File,
                sourceNoteIds: [noteId],
                customCss: '',
            }, exportOptions);
            const service = InteropService_1.default.instance();
            const result = yield service.export(fullExportOptions);
            console.info('Export HTML result: ', result);
            return tempFile;
        });
    }
    static exportNoteTo_(target, noteId, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            let win = null;
            let htmlFile = null;
            const cleanup = () => {
                if (win)
                    win.destroy();
                if (htmlFile)
                    shim_1.default.fsDriver().remove(htmlFile);
            };
            try {
                const exportOptions = {
                    customCss: options.customCss ? options.customCss : '',
                };
                htmlFile = yield this.exportNoteToHtmlFile(noteId, exportOptions);
                const windowOptions = {
                    show: false,
                };
                win = bridge().newBrowserWindow(windowOptions);
                return new Promise((resolve, reject) => {
                    win.webContents.on('did-finish-load', () => {
                        // did-finish-load will trigger when most assets are done loading, probably
                        // images, JavaScript and CSS. However it seems it might trigger *before*
                        // all fonts are loaded, which will break for example Katex rendering.
                        // So we need to add an additional timer to make sure fonts are loaded
                        // as it doesn't seem there's any easy way to figure that out.
                        shim_1.default.setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                            if (target === 'pdf') {
                                try {
                                    const data = yield win.webContents.printToPDF(options);
                                    resolve(data);
                                }
                                catch (error) {
                                    reject(error);
                                }
                                finally {
                                    cleanup();
                                }
                            }
                            else {
                                // TODO: it is crashing at this point :(
                                // Appears to be a Chromium bug: https://github.com/electron/electron/issues/19946
                                // Maybe can be fixed by doing everything from main process?
                                // i.e. creating a function `print()` that takes the `htmlFile` variable as input.
                                win.webContents.print(options, (success, reason) => {
                                    // TODO: This is correct but broken in Electron 4. Need to upgrade to 5+
                                    // It calls the callback right away with "false" even if the document hasn't be print yet.
                                    cleanup();
                                    if (!success && reason !== 'cancelled')
                                        reject(new Error(`Could not print: ${reason}`));
                                    resolve();
                                });
                            }
                        }), 2000);
                    });
                    win.loadURL(url.format({
                        pathname: htmlFile,
                        protocol: 'file:',
                        slashes: true,
                    }));
                });
            }
            catch (error) {
                cleanup();
                throw error;
            }
        });
    }
    static exportNoteToPdf(noteId, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.exportNoteTo_('pdf', noteId, options);
        });
    }
    static printNote(noteId, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.exportNoteTo_('printer', noteId, options);
        });
    }
    static defaultFilename(noteId, fileExtension) {
        return __awaiter(this, void 0, void 0, function* () {
            // Default filename is just the date
            const date = time.formatMsToLocal(new Date().getTime(), time.dateFormat());
            let filename = friendlySafeFilename(`${date}`, 100);
            if (noteId) {
                const note = yield Note.load(noteId);
                // In a rare case the passed note will be null, use the id for filename
                filename = friendlySafeFilename(note ? note.title : noteId, 100);
            }
            return `${filename}.${fileExtension}`;
        });
    }
    static export(_dispatch, module, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options)
                options = {};
            let path = null;
            if (module.target === 'file') {
                const noteId = options.sourceNoteIds && options.sourceNoteIds.length ? options.sourceNoteIds[0] : null;
                path = bridge().showSaveDialog({
                    filters: [{ name: module.description, extensions: module.fileExtensions }],
                    defaultPath: yield this.defaultFilename(noteId, module.fileExtensions[0]),
                });
            }
            else {
                path = bridge().showOpenDialog({
                    properties: ['openDirectory', 'createDirectory'],
                });
            }
            if (!path || (Array.isArray(path) && !path.length))
                return;
            if (Array.isArray(path))
                path = path[0];
            CommandService_1.default.instance().execute('showModalMessage', { message: _('Exporting to "%s" as "%s" format. Please wait...', path, module.format) });
            const exportOptions = {};
            exportOptions.path = path;
            exportOptions.format = module.format;
            exportOptions.modulePath = module.path;
            exportOptions.target = module.target;
            if (options.sourceFolderIds)
                exportOptions.sourceFolderIds = options.sourceFolderIds;
            if (options.sourceNoteIds)
                exportOptions.sourceNoteIds = options.sourceNoteIds;
            const service = InteropService_1.default.instance();
            try {
                const result = yield service.export(exportOptions);
                console.info('Export result: ', result);
            }
            catch (error) {
                console.error(error);
                bridge().showErrorMessageBox(_('Could not export notes: %s', error.message));
            }
            CommandService_1.default.instance().execute('hideModalMessage');
        });
    }
}
exports.default = InteropServiceHelper;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSW50ZXJvcFNlcnZpY2VIZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJJbnRlcm9wU2VydmljZUhlbHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLHdFQUFpRTtBQUNqRSxnRUFBeUQ7QUFDekQsbUNBQTRCO0FBQzVCLHNEQUFtRjtBQUVuRixNQUFNLEVBQUUsQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN0RSxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDdEQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDM0MsTUFBTSxFQUFFLG9CQUFvQixFQUFFLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDM0QsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQzlDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFXM0IsTUFBcUIsb0JBQW9CO0lBRWhDLE1BQU0sQ0FBTyxvQkFBb0IsQ0FBQyxNQUFhLEVBQUUsYUFBK0I7O1lBQ3ZGLE1BQU0sUUFBUSxHQUFHLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLENBQUM7WUFFdkYsTUFBTSxpQkFBaUIsR0FBaUIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUU7Z0JB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