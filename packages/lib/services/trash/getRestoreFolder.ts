import { _ } from '../../locale';
import Folder from '../../models/Folder';
import { FolderEntity } from '../database/types';

const restoreFolderTitle = () => {
	return _('Restored notes');
};

export default async () => {
	const existingFolder: FolderEntity = await Folder.loadByTitle(restoreFolderTitle());

	// If the restore folder exists but is in another folder it might not be
	// obvious where it is, so we still create a new one.
	if (existingFolder && !existingFolder.parent_id) return existingFolder;

	const folder = await Folder.save({ title: restoreFolderTitle() });
	return folder;
};
