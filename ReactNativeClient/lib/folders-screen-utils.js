import { Folder } from 'lib/models/folder.js'

class FoldersScreenUtils {

	static async refreshFolders() {
		let initialFolders = await Folder.all({ includeConflictFolder: true });

		this.dispatch({
			type: 'FOLDERS_UPDATE_ALL',
			folders: initialFolders,
		});
	}

}

export { FoldersScreenUtils }