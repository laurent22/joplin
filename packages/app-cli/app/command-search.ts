import BaseCommand from './base-command';
import { _ } from '@joplin/lib/locale';
import BaseModel from '@joplin/lib/BaseModel';
import Folder from '@joplin/lib/models/Folder';
import uuid from '@joplin/lib/uuid';

class Command extends BaseCommand {
	public override usage() {
		return 'search <pattern> [notebook]';
	}

	public override description() {
		return _('Searches for the given <pattern> in all the notes.');
	}

	public override compatibleUis() {
		return ['gui'];
	}

	// eslint-disable-next-line id-denylist -- `notebook` is the CLI argument name declared in usage() and accessed via bracket notation; the identifier appears here only as a type property key
	public override async action(args: { pattern: string; notebook?: string }) {
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
