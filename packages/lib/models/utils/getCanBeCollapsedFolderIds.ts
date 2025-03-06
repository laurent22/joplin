import { FolderEntity } from '../../services/database/types';
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

	return canBeCollapsedIds;
};
