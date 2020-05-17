const BaseItem = require('lib/models/BaseItem.js');
const BaseModel = require('lib/BaseModel.js');

class FolderTag extends BaseItem {
	static tableName() {
		return 'folder_tags';
	}

	static modelType() {
		return BaseModel.TYPE_FOLDER_TAG;
	}

	// This method works for all folders including those in trash
	static async exists(folderId, tagId) {
		const r = await this.db().selectOne('SELECT folder_id FROM folder_tags WHERE tag_id = ? AND folder_id = ? LIMIT 1', [tagId, folderId]);
		return !!r;
	}
}

module.exports = FolderTag;
