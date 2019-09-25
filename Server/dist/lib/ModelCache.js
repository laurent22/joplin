class ModelCache {
	constructor(maxSize) {
		this.cache_ = [];
		this.maxSize_ = maxSize;
	}

	fromCache(ModelClass, id) {
		for (let i = 0; i < this.cache_.length; i++) {
			const c = this.cache_[i];
			if (c.id === id && c.modelType === ModelClass.modelType()) return c;
		}
		return null;
	}

	cache(ModelClass, id, model) {
		if (this.fromCache(ModelClass, model.id)) return;
		this.cache_.push({
			id: id,
			model: model,
			modelType: ModelClass.modelType(),
		});

		if (this.cache_.length > this.maxSize_) {
			this.cache_.splice(0, 1);
		}
	}

	async load(ModelClass, id) {
		const cached = this.fromCache(ModelClass, id);
		if (cached) return cached.model;
		const output = await ModelClass.load(id);
		this.cache(ModelClass, id, output);
		return output;
	}
}

module.exports = ModelCache;
