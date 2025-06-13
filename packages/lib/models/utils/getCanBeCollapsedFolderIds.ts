import { FolderEntity } from '../../services/database/types';
import { getTrashFolderId } from '../../services/trash';
import Folder, { FolderEntityWithChildren } from '../Folder';

export default (folders: FolderEntity[]) => {
	const tree = Folder.buildTree(folders);

	const canBeCollapsedIds: string[] = [];

	const processTree = (folders: FolderEntityWithChildren[]) => {
		for (const folder of folders) {
			if (folder.children.length) {
				canBeCollapsedIds.push(folder.id);
				processTree(folder.children);
			}
		}
	};

	processTree(tree);

	// Logic to determine whether trash should be included in canBeCollapsedIds
	// Loops over all folders recursively in case in the future a deleted folder remains child of a not deleted folder (and hence there is no deleted folder in 'tree').
	const isTrashCollapsable = (folders: FolderEntityWithChildren[]) => {
		for (const folder of folders) {
			if (folder.deleted_time) {
				canBeCollapsedIds.push(getTrashFolderId());
				return;
			}

			if (folder.children.length) {
				isTrashCollapsable(folder.children);
			}
		}
	};

	// Future proofing: if TrashFolder is already in canBeCollapsedIds do not add it again.
	if (!(getTrashFolderId() in canBeCollapsedIds)) {
		isTrashCollapsable(tree);
	}

	return canBeCollapsedIds;
};
