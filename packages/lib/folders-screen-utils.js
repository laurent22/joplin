const Folder = require('./models/Folder').default;
const Setting = require('./models/Setting').default;
const shim = require('./shim').default;

class FoldersScreenUtils {
	static async allForDisplay(options = {}) {
		const orderDir = Setting.value('folders.sortOrder.reverse') ? 'DESC' : 'ASC';

		const folderOptions = {

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
	}

	static async refreshFolders() {
		FoldersScreenUtils.refreshCalls_.push(true);
		try {
			const folders = await this.allForDisplay({ includeConflictFolder: true });

			this.dispatch({
				type: 'FOLDER_UPDATE_ALL',
				items: folders,
			});
		} finally {
			FoldersScreenUtils.refreshCalls_.pop();
		}
	}

	static scheduleRefreshFolders() {
		if (this.scheduleRefreshFoldersIID_) shim.clearTimeout(this.scheduleRefreshFoldersIID_);
		this.scheduleRefreshFoldersIID_ = shim.setTimeout(() => {
			this.scheduleRefreshFoldersIID_ = null;
			this.refreshFolders();
		}, 1000);
	}

	static async cancelTimers() {
		if (this.scheduleRefreshFoldersIID_) {
			shim.clearTimeout(this.scheduleRefreshFoldersIID_);
			this.scheduleRefreshFoldersIID_ = null;
		}
		return new Promise((resolve) => {
			const iid = shim.setInterval(() => {
				if (!FoldersScreenUtils.refreshCalls_.length) {
					shim.clearInterval(iid);
					resolve();
				}
			}, 100);
		});
	}
}

FoldersScreenUtils.refreshCalls_ = [];

module.exports = { FoldersScreenUtils };
