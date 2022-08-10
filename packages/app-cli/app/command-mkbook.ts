const { BaseCommand } = require('./base-command.js');
const { app } = require('./app.js');
import { _ } from '@joplin/lib/locale';
import BaseModel from '@joplin/lib/BaseModel';
import Folder from '@joplin/lib/models/Folder';
import { FolderEntity } from '@joplin/lib/services/database/types';

class Command extends BaseCommand {

	protected usage() {
		return 'mkbook <new-notebook> [notebook]';
	}

	protected description() {
		return _('Creates a new notebook.');
	}

	protected options() {
		return [
			['-s, --sub', _('Creates the new notebook as a sub-notebook')],
		];
	}

	// validDestinationSubNotebook check for presents and ambiguous notebooks
	private async validDestinationSubNotebook(targetNotebook: string) {

		const dstFolder = await app().loadItem(BaseModel.TYPE_FOLDER, targetNotebook);
		if (!dstFolder) {
			throw new Error(_('Cannot find "%s", please create it first.', targetNotebook));
		}

		const dstDups = await Folder.search({ titlePattern: targetNotebook, limit: 2 });
		if (dstDups.length > 1) {
			throw new Error(_('Ambiguous notebook "%s". Please use notebook id instead - look for parent id in metadata', targetNotebook));
		}

		return dstFolder;
	}

	protected async action(args: any) {
		const createSubNotebook = args.options && args.options.sub === true;
		const targetNotebook = args['notebook'];
		const newNotebook: FolderEntity = {
			title: args['new-notebook'],
		};

		if (createSubNotebook) {
			if (targetNotebook) {
				const dstNotebook = await this.validDestinationSubNotebook(targetNotebook);
				newNotebook.parent_id = dstNotebook.id;

				const folder = await Folder.save(newNotebook, { userSideValidation: true });
				app().switchCurrentFolder(folder);

			} else {
				newNotebook.parent_id = app().currentFolder().id;
				const folder = await Folder.save(newNotebook, { userSideValidation: true });
				app().switchCurrentFolder(folder);
			}

		} else {
			const folder = await Folder.save(newNotebook, { userSideValidation: true });
			app().switchCurrentFolder(folder);
		}
	}
}

module.exports = Command;
