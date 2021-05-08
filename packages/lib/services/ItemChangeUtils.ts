import Setting from '../models/Setting';
import ItemChange from '../models/ItemChange';

export default class ItemChangeUtils {
	static async deleteProcessedChanges() {
		const lastProcessedChangeIds = [
			Setting.value('resourceService.lastProcessedChangeId'),
			Setting.value('searchEngine.lastProcessedChangeId'),
			Setting.value('revisionService.lastProcessedChangeId'),
		];

		const lowestChangeId = Math.min(...lastProcessedChangeIds);
		await ItemChange.deleteOldChanges(lowestChangeId);
	}
}
