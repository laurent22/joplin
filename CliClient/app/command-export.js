const { BaseCommand } = require('./base-command.js');
const { Exporter } = require('lib/services/exporter.js');
const BaseModel = require('lib/BaseModel.js');
const Note = require('lib/models/Note.js');
const { reg } = require('lib/registry.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const fs = require('fs-extra');

class Command extends BaseCommand {

	usage() {
		return 'export <directory>';
	}

	description() {
		return _('Exports Joplin data to the given directory. By default, it will export the complete database including notebooks, notes, tags and resources.');
	}

	options() {
		return [
			['--note <note>', _('Exports only the given note.')],
			['--notebook <notebook>', _('Exports only the given notebook.')],
		];
	}
	
	async action(args) {
		let exportOptions = {};
		exportOptions.destDir = args.directory;
		exportOptions.writeFile = (filePath, data) => {
			return fs.writeFile(filePath, data);
		};
		exportOptions.copyFile = (source, dest) => {
			return fs.copy(source, dest, { overwrite: true });
		};

		if (args.options.note) {

			const notes = await app().loadItems(BaseModel.TYPE_NOTE, args.options.note, { parent: app().currentFolder() });
			if (!notes.length) throw new Error(_('Cannot find "%s".', args.options.note));
			exportOptions.sourceNoteIds = notes.map((n) => n.id);

		} else if (args.options.notebook) {

			const folders = await app().loadItems(BaseModel.TYPE_FOLDER, args.options.notebook);
			if (!folders.length) throw new Error(_('Cannot find "%s".', args.options.notebook));
			exportOptions.sourceFolderIds = folders.map((n) => n.id);

		}

		const exporter = new Exporter();
		const result = await exporter.export(exportOptions);

		reg.logger().info('Export result: ', result);
	}

}

module.exports = Command;