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
		return 'import <path>';
	}

	description() {
		return _('Imports data into Joplin.');
	}

	options() {
		return [
			['--format <format>', 'auto, jex, md'],
			['--notebook <notebook>', 'Notebook to import the notes to.'],
		];
	}
	
	async action(args) {
		const folder = await app().loadItem(BaseModel.TYPE_FOLDER, args.options.notebook);

		const importOptions = {};
		importOptions.path = args.path;
		importOptions.format = args.options.format ? args.options.format : 'jex';
		importOptions.destinationFolderId = folder ? folder.id : null;

		const service = new InteropService();
		const result = await service.import(importOptions);

		result.warnings.map((w) => this.stdout(w));
	}

}

module.exports = Command;