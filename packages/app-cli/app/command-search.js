const BaseCommand = require('./base-command').default;
const { _ } = require('@joplin/lib/locale');
const BaseModel = require('@joplin/lib/BaseModel').default;
const Folder = require('@joplin/lib/models/Folder').default;
const uuid = require('@joplin/lib/uuid').default;

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
		const pattern = args['pattern'];
		const folderTitle = args['notebook'];

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
