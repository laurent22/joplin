const Folder = require('lib/models/Folder.js');
const Tag = require('lib/models/Tag.js');
const Setting = require('lib/models/Setting.js');
const { TRASH_TAG_ID } = require('lib/reserved-ids');

class FoldersScreenUtils {

	// Remove any folders in trash that do no longer have children in trash.
	// Folders are kept in trash to allow them to be restored if a child note
	// is restored. If they have no child note in trash, then they will never
	// be restored and are no longer needed. This applies for the initial
	// implementation of trash, and will not be necessary in iteration two
	// where folders also are presented to the user in trash, and not just notes.
	//
	// Note that ghosts of trashed items may remaining in the folder-tag
	// table, so some folders may not be deleted even when they should be.
	static async cleanupFoldersInTrash_() {
		const folderIds = await Tag.folderIds(TRASH_TAG_ID);
		for (let i = 0; i < folderIds.length; i++) {
			const hasTrash = await Folder.hasTrash(folderIds[i]);
			if (!hasTrash) {
				await Folder.delete(folderIds[i]);
			}
		}
	}

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
			await Folder.addNoteCounts(folders,
				Setting.value('showCompletedTodos'));
		}

		await FoldersScreenUtils.cleanupFoldersInTrash_();

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
		if (this.scheduleRefreshFoldersIID_) clearTimeout(this.scheduleRefreshFoldersIID_);
		this.scheduleRefreshFoldersIID_ = setTimeout(() => {
			this.scheduleRefreshFoldersIID_ = null;
			this.refreshFolders();
		}, 1000);
	}

	static async cancelTimers() {
		if (this.scheduleRefreshFoldersIID_) {
			clearTimeout(this.scheduleRefreshFoldersIID_);
			this.scheduleRefreshFoldersIID_ = null;
		}
		return new Promise((resolve) => {
			const iid = setInterval(() => {
				if (!FoldersScreenUtils.refreshCalls_.length) {
					clearInterval(iid);
					resolve();
				}
			}, 100);
		});
	}
}

FoldersScreenUtils.refreshCalls_ = [];

module.exports = { FoldersScreenUtils };
