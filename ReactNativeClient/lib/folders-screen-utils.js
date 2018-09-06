const Folder = require('lib/models/Folder.js');

class FoldersScreenUtils {

	static async refreshFolders() {
		let initialFolders = await Folder.all({
			includeConflictFolder: true,
			order: [{
				by: "title",
				dir: "asc"
			}]
		});

		this.dispatch({
			type: 'FOLDER_UPDATE_ALL',
			items: initialFolders,
		});
	}

}

module.exports = {
	FoldersScreenUtils
};