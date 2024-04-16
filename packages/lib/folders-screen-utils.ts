import { Dispatch } from 'redux';
import Folder from './models/Folder';
import Setting from './models/Setting';
import shim from './shim';
import { FolderLoadOptions } from './models/utils/types';

const refreshCalls_: boolean[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
let scheduleRefreshFoldersIID_: any = null;

export const allForDisplay = async (options: FolderLoadOptions = {}) => {
	const orderDir = Setting.value('folders.sortOrder.reverse') ? 'DESC' : 'ASC';

	const folderOptions: FolderLoadOptions = {
		caseInsensitive: true,
		order: [
			{
				by: 'title',
				dir: orderDir,
			},
		],
		...options,
	};

	let folders = await Folder.all(folderOptions);

	if (Setting.value('folders.sortOrder.field') === 'last_note_user_updated_time') {
		folders = await Folder.orderByLastModified(folders, orderDir);
	}

	if (Setting.value('showNoteCounts')) {
		await Folder.addNoteCounts(folders,
			Setting.value('showCompletedTodos'));
	}

	return folders;
};

export const refreshFolders = async (dispatch: Dispatch) => {
	refreshCalls_.push(true);
	try {
		const folders = await allForDisplay({
			includeConflictFolder: true,
			includeTrash: true,
		});

		dispatch({
			type: 'FOLDER_UPDATE_ALL',
			items: folders,
		});
	} finally {
		refreshCalls_.pop();
	}
};

export const scheduleRefreshFolders = async (dispatch: Dispatch) => {
	if (scheduleRefreshFoldersIID_) shim.clearTimeout(scheduleRefreshFoldersIID_);
	scheduleRefreshFoldersIID_ = shim.setTimeout(() => {
		scheduleRefreshFoldersIID_ = null;
		void refreshFolders(dispatch);
	}, 1000);
};

export const cancelTimers = async () => {
	if (scheduleRefreshFoldersIID_) {
		shim.clearTimeout(scheduleRefreshFoldersIID_);
		scheduleRefreshFoldersIID_ = null;
	}
	return new Promise((resolve) => {
		const iid = shim.setInterval(() => {
			if (!refreshCalls_.length) {
				shim.clearInterval(iid);
				resolve(null);
			}
		}, 100);
	});
};
