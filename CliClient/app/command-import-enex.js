const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const { Folder } = require('lib/models/folder.js');
const { importEnex } = require('lib/import-enex');
const { filename, basename } = require('lib/path-utils.js');
const { cliUtils } = require('./cli-utils.js');

class Command extends BaseCommand {

	usage() {
		return 'import-enex <file> [notebook]';
	}

	description() {
		return _('Imports an Evernote notebook file (.enex file).');
	}

	options() {
		return [
			['-f, --force', _('Do not ask for confirmation.')],
		];
	}

	async action(args) {
		let filePath = args.file;
		let folder = null;
		let folderTitle = args['notebook'];
		let force = args.options.force === true;

		if (!folderTitle) folderTitle = filename(filePath);
		folder = await Folder.loadByField('title', folderTitle);
		const msg = folder ? _('File "%s" will be imported into existing notebook "%s". Continue?', basename(filePath), folderTitle) : _('New notebook "%s" will be created and file "%s" will be imported into it. Continue?', folderTitle, basename(filePath));
		const ok = force ? true : await this.prompt(msg);
		if (!ok) return;

		let lastProgress = '';

		let options = {
			onProgress: (progressState) => {
				let line = [];
				line.push(_('Found: %d.', progressState.loaded));
				line.push(_('Created: %d.', progressState.created));
				if (progressState.updated) line.push(_('Updated: %d.', progressState.updated));
				if (progressState.skipped) line.push(_('Skipped: %d.', progressState.skipped));
				if (progressState.resourcesCreated) line.push(_('Resources: %d.', progressState.resourcesCreated));
				if (progressState.notesTagged) line.push(_('Tagged: %d.', progressState.notesTagged));
				lastProgress = line.join(' ');
				cliUtils.redraw(lastProgress);
			},
			onError: (error) => {
				let s = error.trace ? error.trace : error.toString();
				this.stdout(s);
			},
		}

		folder = !folder ? await Folder.save({ title: folderTitle }) : folder;
		
		app().gui().showConsole();
		this.stdout(_('Importing notes...'));
		await importEnex(folder.id, filePath, options);
		cliUtils.redrawDone();
		this.stdout(_('The notes have been imported: %s', lastProgress));
	}

}

module.exports = Command;