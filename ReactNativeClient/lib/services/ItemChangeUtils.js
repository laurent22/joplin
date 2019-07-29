const Setting = require('lib/models/Setting');
const ItemChange = require('lib/models/ItemChange');

class ItemChangeUtils {
	static async deleteProcessedChanges() {
		const lastProcessedChangeIds = [Setting.value('resourceService.lastProcessedChangeId'), Setting.value('searchEngine.lastProcessedChangeId'), Setting.value('revisionService.lastProcessedChangeId')];

		const lowestChangeId = Math.min(...lastProcessedChangeIds);
		await ItemChange.deleteOldChanges(lowestChangeId);
	}
}

module.exports = ItemChangeUtils;
