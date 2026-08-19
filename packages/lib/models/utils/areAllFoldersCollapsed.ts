import { FolderEntity } from '../../services/database/types';
import getCanBeCollapsedFolderIds from './getCanBeCollapsedFolderIds';

export default (folders: FolderEntity[], collapsedFolderIds: string[]) => {
	const canBeCollapsedIds = getCanBeCollapsedFolderIds(folders);
	if (collapsedFolderIds.length !== canBeCollapsedIds.length) return false;
	collapsedFolderIds = collapsedFolderIds.slice().sort();
	canBeCollapsedIds.sort();
	return JSON.stringify(collapsedFolderIds) === JSON.stringify(canBeCollapsedIds);
};
