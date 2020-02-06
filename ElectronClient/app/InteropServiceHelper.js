const { _ } = require('lib/locale');
const { bridge } = require('electron').remote.require('./bridge');
const InteropService = require('lib/services/InteropService');
const Setting = require('lib/models/Setting');
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
				win.webContents.on('did-finish-load', async () => {

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
						win.webContents.print(options, (success, reason) => {
							// TODO: This is correct but broken in Electron 4. Need to upgrade to 5+
							// It calls the callback right away with "false" even if the document hasn't be print yet.

							cleanup();
							if (!success && reason !== 'cancelled') reject(new Error(`Could not print: ${reason}`));
							resolve();
						});
					}
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

	static async export(dispatch, module, options = null) {
		if (!options) options = {};

		let path = null;

		if (module.target === 'file') {
			path = bridge().showSaveDialog({
				filters: [{ name: module.description, extensions: module.fileExtensions }],
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
