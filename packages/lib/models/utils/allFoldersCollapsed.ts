import Folder from '../Folder';
import Setting from '../Setting';

export default async () => {
	const collapsedFolderIds = Setting.value('collapsedFolderIds');
	const allIds = await Folder.allIds();
	if (collapsedFolderIds.length !== allIds.length) return false;
	collapsedFolderIds.slice().sort();
	allIds.slice().sort();
	return JSON.stringify(collapsedFolderIds) === JSON.stringify(allIds);
};
