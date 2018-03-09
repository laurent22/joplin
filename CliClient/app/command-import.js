const { BaseCommand } = require('./base-command.js');
const InteropService = require('lib/services/InteropService.js');
const BaseModel = require('lib/BaseModel.js');
const Note = require('lib/models/Note.js');
const { filename, basename, fileExtension } = require('lib/path-utils.js');
const { importEnex } = require('lib/import-enex');
const { cliUtils } = require('./cli-utils.js');
const { reg } = require('lib/registry.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const fs = require('fs-extra');

class Command extends BaseCommand {
	
	usage() {
		return 'import <path> [notebook]';
	}

	description() {
		return _('Imports data into Joplin.');
	}

	options() {
		const service = new InteropService();
		const formats = service.modules().filter(m => m.type === 'importer').map(m => m.format);

		return [
			['--format <format>', _('Source format: %s', (['auto'].concat(formats)).join(', '))],
			['-f, --force', _('Do not ask for confirmation.')],
		];
	}
	
	async action(args) {
		let folder = await app().loadItem(BaseModel.TYPE_FOLDER, args.notebook);

		if (args.notebook && !folder) throw new Error(_('Cannot find "%s".', args.notebook));

		const importOptions = {};
		importOptions.path = args.path;
		importOptions.format = args.options.format ? args.options.format : 'auto';
		importOptions.destinationFolderId = folder ? folder.id : null;

		let lastProgress = '';

		// onProgress/onError supported by Enex import only

		importOptions.onProgress = (progressState) => {
			let line = [];
			line.push(_('Found: %d.', progressState.loaded));
			line.push(_('Created: %d.', progressState.created));
			if (progressState.updated) line.push(_('Updated: %d.', progressState.updated));
			if (progressState.skipped) line.push(_('Skipped: %d.', progressState.skipped));
			if (progressState.resourcesCreated) line.push(_('Resources: %d.', progressState.resourcesCreated));
			if (progressState.notesTagged) line.push(_('Tagged: %d.', progressState.notesTagged));
			lastProgress = line.join(' ');
			cliUtils.redraw(lastProgress);
		};

		importOptions.onError = (error) => {
			let s = error.trace ? error.trace : error.toString();
			this.stdout(s);
		};

		app().gui().showConsole();
		this.stdout(_('Importing notes...'));
		const service = new InteropService();
		const result = await service.import(importOptions);
		result.warnings.map((w) => this.stdout(w));
		cliUtils.redrawDone();
		if (lastProgress) this.stdout(_('The notes have been imported: %s', lastProgress));
	}

}

module.exports = Command;