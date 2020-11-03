const Setting = require('../models/Setting').default;
const ItemChange = require('../models/ItemChange');

class ItemChangeUtils {
	static async deleteProcessedChanges() {
		const lastProcessedChangeIds = [Setting.value('resourceService.lastProcessedChangeId'), Setting.value('searchEngine.lastProcessedChangeId'), Setting.value('revisionService.lastProcessedChangeId')];

		const lowestChangeId = Math.min(...lastProcessedChangeIds);
		await ItemChange.deleteOldChanges(lowestChangeId);
	}
}

module.exports = ItemChangeUtils;
