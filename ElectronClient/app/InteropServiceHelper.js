const { _ } = require('lib/locale');
const { bridge } = require('electron').remote.require('./bridge');
const InteropService = require('lib/services/InteropService');

class InteropServiceHelper {

	static async export(dispatch, module, options = null) {
		if (!options) options = {};

		let path = null;

		if (module.target === 'file') {
			path = bridge().showSaveDialog({
				filters: [{ name: module.description, extensions: [module.fileExtension]}]
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
		if (options.sourceFolderIds) exportOptions.sourceFolderIds = options.sourceFolderIds;
		if (options.sourceNoteIds) exportOptions.sourceNoteIds = options.sourceNoteIds;

		const service = new InteropService();
		const result = await service.export(exportOptions);

		console.info('Export result: ', result);

		dispatch({
			type: 'WINDOW_COMMAND',
			name: 'hideModalMessage',
		});
	}

}

module.exports = InteropServiceHelper;