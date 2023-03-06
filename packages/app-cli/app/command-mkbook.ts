const BaseCommand = require('./base-command').default;
const { app } = require('./app.js');
import { _ } from '@joplin/lib/locale';
import BaseModel from '@joplin/lib/BaseModel';
import Folder from '@joplin/lib/models/Folder';
import { FolderEntity } from '@joplin/lib/services/database/types';

class Command extends BaseCommand {
	public usage() {
		return 'mkbook <new-notebook>';
	}

	public description() {
		return _('Creates a new notebook.');
	}

	public options() {
		return [
			['-p, --parent <parent-notebook>', _('Create a new notebook under a parent notebook.')],
		];
	}

	// validDestinationFolder check for presents and ambiguous folders
	public async validDestinationFolder(targetFolder: string) {

		const destinationFolder = await app().loadItem(BaseModel.TYPE_FOLDER, targetFolder);
		if (!destinationFolder) {
			throw new Error(_('Cannot find: "%s"', targetFolder));
		}

		const destinationDups = await Folder.search({ titlePattern: targetFolder, limit: 2 });
		if (destinationDups.length > 1) {
			throw new Error(_('Ambiguous notebook "%s". Please use short notebook id instead - press "ti" to see the short notebook id', targetFolder));
		}

		return destinationFolder;
	}

	public async saveAndSwitchFolder(newFolder: FolderEntity) {

		const folder = await Folder.save(newFolder, { userSideValidation: true });
		app().switchCurrentFolder(folder);

	}

	public async action(args: any) {
		const targetFolder = args.options.parent;

		const newFolder: FolderEntity = {
			title: args['new-notebook'],
		};

		if (targetFolder) {

			const destinationFolder = await this.validDestinationFolder(targetFolder);
			newFolder.parent_id = destinationFolder.id;
			await this.saveAndSwitchFolder(newFolder);

		} else {
			await this.saveAndSwitchFolder(newFolder);
		}
	}
}

module.exports = Command;
