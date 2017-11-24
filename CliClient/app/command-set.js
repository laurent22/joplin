const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const { BaseModel } = require('lib/base-model.js');
const { Folder } = require('lib/models/folder.js');
const { Note } = require('lib/models/note.js');
const { BaseItem } = require('lib/models/base-item.js');

class Command extends BaseCommand {

	usage() {
		return 'set <note> <name> [value]';
	}

	enabled() {
		return false;
	}

	description() {
		return _('Sets the property <name> of the given <note> to the given [value].');
	}

	hidden() {
		return true;
	}

	async action(args) {
		let title = args['note'];
		let propName = args['name'];
		let propValue = args['value'];
		if (!propValue) propValue = '';

		let notes = await app().loadItems(BaseModel.TYPE_NOTE, title);
		if (!notes.length) throw new Error(_('Cannot find "%s".', title));

		for (let i = 0; i < notes.length; i++) {
			let newNote = {
				id: notes[i].id,
				type_: notes[i].type_,
			};
			newNote[propName] = propValue;
			await Note.save(newNote);
		}
	}

}

module.exports = Command;