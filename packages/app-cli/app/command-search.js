
import BaseCommand from './base-command';
import { _ } from '@joplin/lib/locale';
import BaseModel from '@joplin/lib/BaseModel';
import Folder from '@joplin/lib/models/Folder';
import uuid from '@joplin/lib/uuid';
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

export default Command;
