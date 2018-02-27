const { BaseCommand } = require('./base-command.js');
const InteropService = require('lib/services/InteropService.js');
const BaseModel = require('lib/BaseModel.js');
const Note = require('lib/models/Note.js');
const { reg } = require('lib/registry.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const fs = require('fs-extra');

class Command extends BaseCommand {

	usage() {
		return 'export <path>';
	}

	description() {
		return _('Exports Joplin data to the given path. By default, it will export the complete database including notebooks, notes, tags and resources.');
	}

	options() {
		const service = new InteropService();
		const formats = service.modules()
			.filter(m => m.type === 'exporter')
			.map(m => m.format + (m.description ? ' (' + m.description + ')' : ''));

		return [
			['--format <format>', _('Destination format: %s', formats.join(', '))],
			['--note <note>', _('Exports only the given note.')],
			['--notebook <notebook>', _('Exports only the given notebook.')],
		];
	}
	
	async action(args) {
		let exportOptions = {};
		exportOptions.path = args.path;

		exportOptions.format = args.options.format ? args.options.format : 'jex';

		if (args.options.note) {

			const notes = await app().loadItems(BaseModel.TYPE_NOTE, args.options.note, { parent: app().currentFolder() });
			if (!notes.length) throw new Error(_('Cannot find "%s".', args.options.note));
			exportOptions.sourceNoteIds = notes.map((n) => n.id);

		} else if (args.options.notebook) {

			const folders = await app().loadItems(BaseModel.TYPE_FOLDER, args.options.notebook);
			if (!folders.length) throw new Error(_('Cannot find "%s".', args.options.notebook));
			exportOptions.sourceFolderIds = folders.map((n) => n.id);

		}

		const service = new InteropService();
		const result = await service.export(exportOptions);

		result.warnings.map((w) => this.stdout(w));
	}

}

module.exports = Command;