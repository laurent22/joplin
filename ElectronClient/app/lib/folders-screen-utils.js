const { Folder } = require('lib/models/folder.js');

class FoldersScreenUtils {

	static async refreshFolders() {
		let initialFolders = await Folder.all({ includeConflictFolder: true });

		this.dispatch({
			type: 'FOLDER_UPDATE_ALL',
			folders: initialFolders,
		});
	}

}

module.exports = { FoldersScreenUtils };