import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Folder } from 'lib/models/folder.js';
import { vorpalUtils } from './vorpal-utils.js';
import { importEnex } from 'import-enex';
import { filename, basename } from 'lib/path-utils.js';

class Command extends BaseCommand {

	usage() {
		return _('import-enex <file> [notebook]');
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

		if (folderTitle) {
			folder = await Folder.loadByField('title', folderTitle);
			if (!folder) {
				let ok = force ? true : await vorpalUtils.cmdPromptConfirm(this, _('Folder does not exists: "%s". Create it?', folderTitle))
				if (!ok) return;

				folder = await Folder.save({ title: folderTitle });
			}
		} else {
			folderTitle = filename(filePath);
			let inc = 0;
			while (true) {
				let t = folderTitle + (inc ? ' (' + inc + ')' : '');
				let f = await Folder.loadByField('title', t);
				if (!f) {
					folderTitle = t;
					break;
				}
				inc++;
			}
		}

		let ok = force ? true : await vorpalUtils.cmdPromptConfirm(this, _('File "%s" will be imported into notebook "%s". Continue?', basename(filePath), folderTitle))
		if (!ok) return;

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
				vorpalUtils.redraw(line.join(' '));
			},
			onError: (error) => {
				vorpalUtils.redrawDone();
				let s = error.trace ? error.trace : error.toString();
				this.log(s);
			},
		}

		folder = !folder ? await Folder.save({ title: folderTitle }) : folder;
		this.log(_('Importing notes...'));
		await importEnex(folder.id, filePath, options);
	}

}

module.exports = Command;