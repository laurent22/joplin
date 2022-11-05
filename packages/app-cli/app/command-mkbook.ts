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

	// validDestinationSubFolder check for presents and ambiguous folders
	private async validDestinationSubFolder(targetFolder: string) {

		const destinationFolder = await app().loadItem(BaseModel.TYPE_FOLDER, targetFolder);
		if (!destinationFolder) {
			throw new Error(_('Cannot find "%s", please create it first.', targetFolder));
		}

		const destinationDups = await Folder.search({ titlePattern: targetFolder, limit: 2 });
		if (destinationDups.length > 1) {
			throw new Error(_('Ambiguous notebook "%s". Please use notebook id instead - press "ti" to see the short notebook id', targetFolder));
		}

		return destinationFolder;
	}

	protected async action(args: any) {
		const createSubFolder = args.options && args.options.sub === true;
		const targetFolder = args['notebook'];
		const newFolder: FolderEntity = {
			title: args['new-notebook'],
		};
		// this.logger().debug('mkbook-command-args: ', args);

		if (createSubFolder) {
			if (targetFolder) {
				const destinationFolder = await this.validDestinationSubFolder(targetFolder);
				newFolder.parent_id = destinationFolder.id;

				const folder = await Folder.save(newFolder, { userSideValidation: true });
				app().switchCurrentFolder(folder);

			} else {
				newFolder.parent_id = app().currentFolder().id;
				const folder = await Folder.save(newFolder, { userSideValidation: true });
				app().switchCurrentFolder(folder);
			}

		} else {
			const folder = await Folder.save(newFolder, { userSideValidation: true });
			app().switchCurrentFolder(folder);
		}
	}
}

module.exports = Command;
