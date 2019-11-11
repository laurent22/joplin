const Folder = require('lib/models/Folder.js');
const Setting = require('lib/models/Setting.js');

class FoldersScreenUtils {
	static async allForDisplay(options = {}) {
		const orderDir = Setting.value('folders.sortOrder.reverse') ? 'DESC' : 'ASC';

		const folderOptions = Object.assign(
			{},
			{
				caseInsensitive: true,
				order: [
					{
						by: 'title',
						dir: orderDir,
					},
				],
			},
			options
		);

		let folders = await Folder.all(folderOptions);

		if (Setting.value('folders.sortOrder.field') === 'last_note_user_updated_time') {
			folders = await Folder.orderByLastModified(folders, orderDir);
		}

		if (Setting.value('showNoteCounts')) {
			await Folder.addNoteCounts(folders);
		}

		return folders;
	}

	static async refreshFolders() {
		const folders = await this.allForDisplay({ includeConflictFolder: true });

		this.dispatch({
			type: 'FOLDER_UPDATE_ALL',
			items: folders,
		});
	}

	static scheduleRefreshFolders() {
		if (this.scheduleRefreshFoldersIID_) clearTimeout(this.scheduleRefreshFoldersIID_);

		this.scheduleRefreshFoldersIID_ = setTimeout(() => {
			this.scheduleRefreshFoldersIID_ = null;
			this.refreshFolders();
		}, 1000);
	}
}

module.exports = { FoldersScreenUtils };
