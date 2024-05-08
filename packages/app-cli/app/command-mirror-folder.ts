import BaseCommand from './base-command';
import BaseModel from '@joplin/lib/BaseModel';
import app from './app';
import { _ } from '@joplin/lib/locale';
import FolderMirroringService from '@joplin/lib/services/filesync/FolderMirroringService';

interface CommandArguments {
	options: {
		['no-watch']?: boolean;
	};
	folder?: string;
	path: string;
}

class Command extends BaseCommand {
	public override usage() {
		return 'mirror-folder <path> [folder]';
	}

	public override description() {
		return _('Syncs a local directory with the contents of [notebook]. If run from within Joplin, that directory is watched for changes.');
	}

	public override async action(args: CommandArguments) {
		const folder = args.folder ? await app().loadItem(BaseModel.TYPE_FOLDER, args.folder) : { id: '' };
		if (args.folder && !folder) throw new Error(_('Cannot find "%s".', args.folder));
		await FolderMirroringService.instance().mirrorFolder(args.path, folder.id);
	}
}

module.exports = Command;
