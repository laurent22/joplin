import InteropService from '@joplin/lib/services/interop/InteropService';
import CommandService from '@joplin/lib/services/CommandService';
import shim from '@joplin/lib/shim';
import { ExportModuleOutputFormat, ExportOptions, FileSystemItem } from '@joplin/lib/services/interop/types';
import { ExportModule } from '@joplin/lib/services/interop/Module';

import { _ } from '@joplin/lib/locale';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import bridge from './services/bridge';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';
const { friendlySafeFilename } = require('@joplin/lib/path-utils');
import time from '@joplin/lib/time';
import { BrowserWindow } from 'electron';
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

		const fullExportOptions: ExportOptions = { path: tempFile,
			format: ExportModuleOutputFormat.Html,
			target: FileSystemItem.File,
			sourceNoteIds: [noteId],
			customCss: '', ...exportOptions };

		const service = InteropService.instance();

		const result = await service.export(fullExportOptions);
		// eslint-disable-next-line no-console
		console.info('Export HTML result: ', result);
		return tempFile;
	}

	private static async exportNoteTo_(target: string, noteId: string, options: ExportNoteOptions = {}) {
		let win: BrowserWindow|null = null;
		let htmlFile: string = null;

		const cleanup = () => {
			if (win) win.destroy();
			if (htmlFile) void shim.fsDriver().remove(htmlFile);
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

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			return new Promise<any>((resolve, reject) => {
				win.webContents.on('did-finish-load', () => {

					// did-finish-load will trigger when most assets are done loading, probably
					// images, JavaScript and CSS. However it seems it might trigger *before*
					// all fonts are loaded, which will break for example Katex rendering.
					// So we need to add an additional timer to make sure fonts are loaded
					// as it doesn't seem there's any easy way to figure that out.
					shim.setTimeout(async () => {
						if (target === 'pdf') {
							try {
								// The below line "opens" all <details> tags
								// before printing. This assures that the
								// contents of the tag are visible in printed
								// pdfs.
								// https://github.com/laurent22/joplin/issues/6254.
								await win.webContents.executeJavaScript('document.querySelectorAll(\'details\').forEach(el=>el.setAttribute(\'open\',\'\'))');
								// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
								const data = await win.webContents.printToPDF(options as any);
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
							//
							// 2024-01-31: Printing with webContents.print still
							// fails on Linux (even if run in the main process).
							// As such, we use window.print(), which seems to work.

							if (shim.isLinux()) {
								await win.webContents.executeJavaScript(`
									// Blocks while the print dialog is open
									window.print();
								`);

								shim.setTimeout(() => {
									// To prevent a crash, the window can only be closed after a timeout.
									// This timeout can't be too small, or else it may still crash (e.g. 100ms
									// is too short).
									//
									// See https://github.com/electron/electron/issues/31635 for details
									cleanup();
									resolve(null);
								}, 1000);
							} else {
								// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
								win.webContents.print(options as any, (success: boolean, reason: string) => {
									cleanup();
									if (!success && reason !== 'cancelled') reject(new Error(`Could not print: ${reason}`));
									resolve(null);
								});
							}
						}
					}, 2000);

				});

				void win.loadURL(url.format({
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

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public static async export(_dispatch: Function, module: ExportModule, options: ExportNoteOptions = null) {
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
			// eslint-disable-next-line no-console
			console.info('Export result: ', result);
		} catch (error) {
			console.error(error);
			bridge().showErrorMessageBox(_('Could not export notes: %s', error.message));
		}

		void CommandService.instance().execute('hideModalMessage');
	}

}
