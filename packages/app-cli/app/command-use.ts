import BaseCommand from './base-command';
import app from './app';
import { _ } from '@joplin/lib/locale';
import BaseModel from '@joplin/lib/BaseModel';
import Folder from '@joplin/lib/models/Folder';

class Command extends BaseCommand {
	public override usage() {
		return 'use <notebook>';
	}

	public override description() {
		return _('Switches to [notebook] - all further operations will happen within this notebook.');
	}

	public override compatibleUis() {
		return ['cli'];
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(args: any) {
		const folder = await app().loadItem(BaseModel.TYPE_FOLDER, args['notebook']);
		if (!folder) throw new Error(_('Cannot find "%s".', args['notebook']));

		// Auto-expand parent folders in GUI if present
		if (app().gui() && app().gui().widget && app().gui().widget('folderList')) {
			const folderListWidget = app().gui().widget('folderList');
			if (folderListWidget.expandToFolder) {
				// Get all folders to pass to expandToFolder
				const folders = await Folder.all();
				folderListWidget.folders = folders; // Ensure widget has current folders
				folderListWidget.expandToFolder(folder.id);
			}
		}

		app().switchCurrentFolder(folder);
	}
}

module.exports = Command;
