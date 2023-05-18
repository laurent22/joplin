import Setting from '../models/Setting';
import ItemChange from '../models/ItemChange';

const dayMs = 86400000;

export default class ItemChangeUtils {
	public static async deleteProcessedChanges(itemMinTtl: number = dayMs * 90) {
		const lastProcessedChangeIds = [
			Setting.value('resourceService.lastProcessedChangeId'),
			Setting.value('searchEngine.lastProcessedChangeId'),
			Setting.value('revisionService.lastProcessedChangeId'),
		];

		const lowestChangeId = Math.min(...lastProcessedChangeIds);
		await ItemChange.deleteOldChanges(lowestChangeId, itemMinTtl);
	}
}
