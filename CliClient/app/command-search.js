const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
const { _ } = require('lib/locale.js');
const BaseModel = require('lib/BaseModel.js');
const Folder = require('lib/models/Folder.js');
const Note = require('lib/models/Note.js');
const { sprintf } = require('sprintf-js');
const { time } = require('lib/time-utils.js');
const { uuid } = require('lib/uuid.js');

class Command extends BaseCommand {

	usage() {
		return 'search <pattern> [notebook]';
	}

	description() {
		return _('Searches for the given <pattern> in all the notes.');
	}

	compatibleUis() {
		return ['gui'];
	}

	async action(args) {
		let pattern = args['pattern'];
		let folderTitle = args['notebook'];

		let folder = null;
		if (folderTitle) {
			folder = await Folder.loadByTitle(folderTitle);
			if (!folder) throw new Error(_('Cannot find "%s".', folderTitle));
		}

		const searchId = uuid.create();

		this.dispatch({
			type: 'SEARCH_ADD',
			search: {
				id: searchId,
				title: pattern,
				query_pattern: pattern,
				query_folder_id: folder ? folder.id : '',
				type_: BaseModel.TYPE_SEARCH,
			},
		});

		this.dispatch({
			type: 'SEARCH_SELECT',
			id: searchId,
		});
	}

}

module.exports = Command;