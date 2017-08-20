import { BaseCommand } from './base-command.js';
import { Exporter } from 'lib/services/exporter.js';
import { BaseModel } from 'lib/base-model.js';
import { Note } from 'lib/models/note.js';
import { reg } from 'lib/registry.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import fs from 'fs-extra';

class Command extends BaseCommand {

	usage() {
		return 'export <destination>';
	}

	description() {
		return _('Exports Joplin data to the given target.');
	}

	options() {
		return [
			['--note <note>', _('Exports only the given note.')],
			['--notebook <notebook>', _('Exports only the given notebook.')],
		];
	}
	
	async action(args) {
		let exportOptions = {};
		exportOptions.destDir = args.destination;
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