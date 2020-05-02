const { _ } = require('lib/locale');
const { bridge } = require('electron').remote.require('./bridge');
const InteropService = require('lib/services/InteropService');
const Setting = require('lib/models/Setting');
const Note = require('lib/models/Note.js');
const Folder = require('lib/models/Folder.js');
const { friendlySafeFilename } = require('lib/path-utils');
const md5 = require('md5');
const url = require('url');
const { shim } = require('lib/shim');

class InteropServiceHelper {

	static async exportNoteToHtmlFile(noteId, exportOptions) {
		const tempFile = `${Setting.value('tempDir')}/${md5(Date.now() + Math.random())}.html`;

		exportOptions = Object.assign({}, {
			path: tempFile,
			format: 'html',
			target: 'file',
			sourceNoteIds: [noteId],
			customCss: '',
		}, exportOptions);

		const service = new InteropService();

		const result = await service.export(exportOptions);
		console.info('Export HTML result: ', result);
		return tempFile;
	}

	static async exportNoteTo_(target, noteId, options = {}) {
		let win = null;
		let htmlFile = null;

		const cleanup = () => {
			if (win) win.destroy();
			if (htmlFile) shim.fsDriver().remove(htmlFile);
		};

		try {
			const exportOptions = {
				customCss: options.customCss ? options.customCss : '',
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
					setTimeout(async () => {
						if (target === 'pdf') {
							try {
								const data = await win.webContents.printToPDF(options);
								resolve(data);
							} catch (error) {
								reject(error);
							} finally {
								cleanup();
							}
						} else {
							// TODO: it is crashing at this point

							win.webContents.print(options, (success, reason) => {
								// TODO: This is correct but broken in Electron 4. Need to upgrade to 5+
								// It calls the callback right away with "false" even if the document hasn't be print yet.

								cleanup();
								if (!success && reason !== 'cancelled') reject(new Error(`Could not print: ${reason}`));
								resolve();
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

	static async exportNoteToPdf(noteId, options = {}) {
		return this.exportNoteTo_('pdf', noteId, options);
	}

	static async printNote(noteId, options = {}) {
		return this.exportNoteTo_('printer', noteId, options);
	}

	static async defaultFilename(noteIds, fileExtension) {
		if (!noteIds) {
			return '';
		}

		const note = await Note.load(noteIds[0]);
		// In a rare case the passed not will be null, use the id for filename
		if (note === null) {
			const filename = friendlySafeFilename(noteIds[0], 100);

			return `${filename}.${fileExtension}`;
		}
		const folder = await Folder.load(note.parent_id);

		const filename = friendlySafeFilename(note.title, 100);

		// In a less rare case the folder will be null, just ignore it
		if (folder === null) {
			return `${filename}.${fileExtension}`;
		}

		const foldername = friendlySafeFilename(folder.title, 100);

		// friendlySafeFilename assumes that the file extension is added after
		return `${foldername} - ${filename}.${fileExtension}`;
	}

	static async export(dispatch, module, options = null) {
		if (!options) options = {};

		let path = null;

		if (module.target === 'file') {
			path = bridge().showSaveDialog({
				filters: [{ name: module.description, extensions: module.fileExtensions }],
				defaultPath: await this.defaultFilename(options.sourceNoteIds, module.fileExtensions[0]),
			});
		} else {
			path = bridge().showOpenDialog({
				properties: ['openDirectory', 'createDirectory'],
			});
		}

		if (!path || (Array.isArray(path) && !path.length)) return;

		if (Array.isArray(path)) path = path[0];

		dispatch({
			type: 'WINDOW_COMMAND',
			name: 'showModalMessage',
			message: _('Exporting to "%s" as "%s" format. Please wait...', path, module.format),
		});

		const exportOptions = {};
		exportOptions.path = path;
		exportOptions.format = module.format;
		exportOptions.modulePath = module.path;
		exportOptions.target = module.target;
		if (options.sourceFolderIds) exportOptions.sourceFolderIds = options.sourceFolderIds;
		if (options.sourceNoteIds) exportOptions.sourceNoteIds = options.sourceNoteIds;

		const service = new InteropService();

		try {
			const result = await service.export(exportOptions);
			console.info('Export result: ', result);
		} catch (error) {
			console.error(error);
			bridge().showErrorMessageBox(_('Could not export notes: %s', error.message));
		}

		dispatch({
			type: 'WINDOW_COMMAND',
			name: 'hideModalMessage',
		});
	}

}

module.exports = InteropServiceHelper;
