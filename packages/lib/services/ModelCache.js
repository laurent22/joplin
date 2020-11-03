const BaseItem = require('lib/models/BaseItem');

class ModelCache {
	constructor() {
		this.cache_ = {};
	}

	async byIds(itemType, ids) {
		const ModelClass = BaseItem.getClassByItemType(itemType);
		const output = [];

		const remainingIds = [];
		for (let i = 0; i < ids.length; i++) {
			const id = ids[i];
			if (!this.cache_[id]) {
				remainingIds.push(id);
			} else {
				output.push(this.cache_[id].model);
			}
		}

		const models = await ModelClass.byIds(remainingIds);
		for (let i = 0; i < models.length; i++) {
			this.cache_[models[i].id] = {
				model: models[i],
				timestamp: Date.now(),
			};

			output.push(models[i]);
		}

		return output;
	}
}

module.exports = ModelCache;
