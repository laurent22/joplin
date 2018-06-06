const Folder = require('lib/models/Folder.js');

class FoldersScreenUtils {

	static async refreshFolders() {
    let initialFolders = await Folder.all({ includeConflictFolder: true });
    let allFolderCountData = await Folder.allFolderNoteCount();
		let notesCount = [];
		for (let n = 0; n < allFolderCountData.length; n++) {
      let mFolder = allFolderCountData[n];
      let searchedFolder = allFolderCountData.find(folder => folder.parent_id === mFolder.id);
		  notesCount[mFolder.id] = (searchedFolder != undefined && searchedFolder != 'undefined') ? searchedFolder.total : 0;
		}
		this.dispatch({
			type: 'FOLDER_UPDATE_ALL',
			items: initialFolders,
			notesCount: notesCount
		});
	}

}

module.exports = { FoldersScreenUtils };