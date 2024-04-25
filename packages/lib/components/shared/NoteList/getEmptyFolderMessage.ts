import { _ } from '../../../locale';
import Folder from '../../../models/Folder';
import Setting from '../../../models/Setting';
import { FolderEntity } from '../../../services/database/types';
import { getTrashFolderId, itemIsInTrash } from '../../../services/trash';

const getEmptyFolderMessage = (folders: FolderEntity[], selectedFolderId: string|null) => {
	if (selectedFolderId === getTrashFolderId()) {
		return _('There are no notes in the trash folder.');
	} else if (selectedFolderId && itemIsInTrash(Folder.byId(folders, selectedFolderId))) {
		return _('This subfolder of the trash has no notes.');
	}

	if (Setting.value('appType') === 'desktop') {
		return _('No notes in here. Create one by clicking on "New note".');
	} else {
		return _('There are currently no notes. Create one by clicking on the (+) button.');
	}
};

export default getEmptyFolderMessage;
