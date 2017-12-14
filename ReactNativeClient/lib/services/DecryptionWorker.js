const BaseItem = require('lib/models/BaseItem');

class DecryptionWorker {

	constructor() {
		this.state_ = 'idle';

		this.dispatch = (action) => {
			console.warn('DecryptionWorker.dispatch is not defined');
		};
	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new DecryptionWorker();
		return this.instance_;
	}

	static encryptionService() {
		if (!this.encryptionService_) throw new Error('DecryptionWorker.encryptionService_ is not set!!');
		return this.encryptionService_;
	}

	async start() {
		if (this.state_ !== 'idle') return;

		this.state_ = 'started';

		let excludedIds = [];

		while (true) {
			const result = await BaseItem.itemsThatNeedDecryption(excludedIds);
			const items = result.items;

			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				const ItemClass = BaseItem.itemClass(item);
				try {
					await ItemClass.decrypt(item);
				} catch (error) {
					if (error.code === 'missingMasterKey') {
						excludedIds.push(item.id);
						this.dispatch({
							type: 'MASTERKEY_ADD_MISSING',
							id: error.masterKeyId,
						});
						continue;
					}
					throw error;
				}
			}

			if (!result.hasMore) break;
		}
	}

}

module.exports = DecryptionWorker;