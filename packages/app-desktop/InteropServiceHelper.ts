import InteropService from '@joplin/lib/services/interop/InteropService';
import CommandService from '@joplin/lib/services/CommandService';
import shim from '@joplin/lib/shim';
import { ExportOptions, FileSystemItem, Module } from '@joplin/lib/services/interop/types';

import { _ } from '@joplin/lib/locale';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
const bridge = require('@electron/remote').require('./bridge').default;
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
const { friendlySafeFilename } = require('@joplin/lib/path-utils');
import time from '@joplin/lib/time';
const md5 = require('md5');
const url = require('url');

interface ExportNoteOptions {
	customCss?: string;
	sourceNoteIds?: string[];
	sourceFolderIds?: string[];
	printBackground?: boolean;
	pageSize?: string;
	landscape?: boolean;
	includeConflicts?: boolean;
	plugins?: PluginStates;
}

export default class InteropServiceHelper {

	private static async exportNoteToHtmlFile(noteId: string, exportOptions: ExportNoteOptions) {
		const tempFile = `${Setting.value('tempDir')}/${md5(Date.now() + Math.random())}.html`;

		const fullExportOptions: ExportOptions = Object.assign({}, {
			path: tempFile,
			format: 'html',
			target: FileSystemItem.File,
			sourceNoteIds: [noteId],
			customCss: '',
		}, exportOptions);

		const service = InteropService.instance();

		const result = await service.export(fullExportOptions);
		console.info('Export HTML result: ', result);
		return tempFile;
	}

	private static async exportNoteTo_(target: string, noteId: string, options: ExportNoteOptions = {}) {
		let win: any = null;
		let htmlFile: string = null;

		const cleanup = () => {
			if (win) win.destroy();
			if (htmlFile) shim.fsDriver().remove(htmlFile);
		};

		try {
			const exportOptions = {
				customCss: options.customCss ? options.customCss : '',
				plugins: options.plugins,
			};

			htmlFile = await this.exportNoteToHtmlFile(noteId, exportOptions);

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
					shim.setTimeout(async () => {
						if (target === 'pdf') {
							try {
								win.webContents.executeJavaScript('document.querySelectorAll(\'details\').forEach(el=>el.setAttribute(\'open\',\'\'))');
								const data = await win.webContents.printToPDF(options);
								resolve(data);
							} catch (error) {
								reject(error);
							} finally {
								cleanup();
							}
						} else {
							// TODO: it is crashing at this point :( Appears to
							// be a Chromium bug:
							// https://github.com/electron/electron/issues/19946
							// Maybe can be fixed by doing everything from main
							// process? i.e. creating a function `print()` that
							// takes the `htmlFile` variable as input.
							//
							// 2021-10-01: This old bug is fixed, and has been
							// replaced by a brand new bug:
							// https://github.com/electron/electron/issues/28192
							// Still doesn't work but at least it doesn't crash
							// the app.

							win.webContents.print(options, (success: boolean, reason: string) => {
								// TODO: This is correct but broken in Electron 4. Need to upgrade to 5+
								// It calls the callback right away with "false" even if the document hasn't be print yet.

								cleanup();
								if (!success && reason !== 'cancelled') reject(new Error(`Could not print: ${reason}`));
								resolve(null);
							});
						}
					}, 2000);

				});

				win.loadURL(url.format({
					pathname: htmlFile,
					protocol: 'file:',
					slashes: true,
				}));
			});
		} catch (error) {
			cleanup();
			throw error;
		}
	}

	public static async exportNoteToPdf(noteId: string, options: ExportNoteOptions = {}) {
		return this.exportNoteTo_('pdf', noteId, options);
	}

	public static async printNote(noteId: string, options: ExportNoteOptions = {}) {
		return this.exportNoteTo_('printer', noteId, options);
	}

	public static async defaultFilename(noteId: string, fileExtension: string) {
		// Default filename is just the date
		const date = time.formatMsToLocal(new Date().getTime(), time.dateFormat());
		let filename = friendlySafeFilename(`${date}`, 100);

		if (noteId) {
			const note = await Note.load(noteId);
			// In a rare case the passed note will be null, use the id for filename
			filename = friendlySafeFilename(note ? note.title : noteId, 100);
		}

		return `${filename}.${fileExtension}`;
	}

	public static async export(_dispatch: Function, module: Module, options: ExportNoteOptions = null) {
		if (!options) options = {};

		let path = null;

		if (module.target === 'file') {
			const noteId = options.sourceNoteIds && options.sourceNoteIds.length ? options.sourceNoteIds[0] : null;
			path = await bridge().showSaveDialog({
				filters: [{ name: module.description, extensions: module.fileExtensions }],
				defaultPath: await this.defaultFilename(noteId, module.fileExtensions[0]),
			});
		} else {
			path = await bridge().showOpenDialog({
				properties: ['openDirectory', 'createDirectory'],
			});
		}

		if (!path || (Array.isArray(path) && !path.length)) return;

		if (Array.isArray(path)) path = path[0];

		void CommandService.instance().execute('showModalMessage', _('Exporting to "%s" as "%s" format. Please wait...', path, module.format));

		const exportOptions: ExportOptions = {};
		exportOptions.path = path;
		exportOptions.format = module.format;
		// exportOptions.modulePath = module.path;
		if (options.plugins) exportOptions.plugins = options.plugins;
		exportOptions.customCss = options.customCss;
		exportOptions.target = module.target;
		exportOptions.includeConflicts = !!options.includeConflicts;
		if (options.sourceFolderIds) exportOptions.sourceFolderIds = options.sourceFolderIds;
		if (options.sourceNoteIds) exportOptions.sourceNoteIds = options.sourceNoteIds;

		const service = InteropService.instance();

		try {
			const result = await service.export(exportOptions);
			console.info('Export result: ', result);
		} catch (error) {
			console.error(error);
			bridge().showErrorMessageBox(_('Could not export notes: %s', error.message));
		}

		void CommandService.instance().execute('hideModalMessage');
	}

}
