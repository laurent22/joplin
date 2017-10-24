import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Folder } from 'lib/models/folder.js';
import { importEnex } from 'import-enex';
import { filename, basename } from 'lib/path-utils.js';
import { cliUtils } from './cli-utils.js';

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
			['--fuzzy-matching', 'For debugging purposes. Do not use.'],
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
			fuzzyMatching: args.options['fuzzy-matching'] === true,
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
		this.stdout(_('Importing notes...'));
		await importEnex(folder.id, filePath, options);
		cliUtils.redrawDone();
		this.stdout(_('The notes have been imported: %s', lastProgress));
	}

}

module.exports = Command;