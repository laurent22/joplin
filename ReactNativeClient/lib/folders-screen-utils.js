const Folder = require('lib/models/Folder.js');

class FoldersScreenUtils {

	static async refreshFolders() {
		let initialFolders = await Folder.all({ includeConflictFolder: true });
		let notesCount = [];
		for (let n = 0; n < initialFolders.length; n++) {
		  let mFolder = initialFolders[n];
		  notesCount[mFolder.id] = await Folder.noteCount(mFolder.id);
		}
		this.dispatch({
			type: 'FOLDER_UPDATE_ALL',
			items: initialFolders,
			notesCount: notesCount
		});
	}

}

module.exports = { FoldersScreenUtils };