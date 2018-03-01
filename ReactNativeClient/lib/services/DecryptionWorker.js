const BaseItem = require('lib/models/BaseItem');
const { Logger } = require('lib/logger.js');

class DecryptionWorker {

	constructor() {
		this.state_ = 'idle';
		this.logger_ = new Logger();

		this.dispatch = (action) => {
			//console.warn('DecryptionWorker.dispatch is not defined');
		};

		this.scheduleId_ = null;
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new DecryptionWorker();
		return this.instance_;
	}

	setEncryptionService(v) {
		this.encryptionService_ = v;
	}

	encryptionService() {
		if (!this.encryptionService_) throw new Error('DecryptionWorker.encryptionService_ is not set!!');
		return this.encryptionService_;
	}

	async scheduleStart() {
		if (this.scheduleId_) return;

		this.scheduleId_ = setTimeout(() => {
			this.scheduleId_ = null;
			this.start({
				materKeyNotLoadedHandler: 'dispatch',
			});
		}, 1000);
	}

	async start(options = null) {
		if (options === null) options = {};
		if (!('materKeyNotLoadedHandler' in options)) options.materKeyNotLoadedHandler = 'throw';

		if (this.state_ !== 'idle') {
			this.logger().info('DecryptionWorker: cannot start because state is "' + this.state_ + '"');
			return;
		}

		this.logger().info('DecryptionWorker: starting decryption...');

		this.state_ = 'started';

		let excludedIds = [];

		try {
			const notLoadedMasterKeyDisptaches = [];

			while (true) {
				const result = await BaseItem.itemsThatNeedDecryption(excludedIds);
				const items = result.items;

				for (let i = 0; i < items.length; i++) {
					const item = items[i];

					// Temp hack
					// if (['edf44b7a0e4f8cbf248e206cd8dfa800', '2ccb3c9af0b1adac2ec6b66a5961fbb1'].indexOf(item.id) >= 0) {
					// 	excludedIds.push(item.id);
					// 	continue;
					// }

					const ItemClass = BaseItem.itemClass(item);
					this.logger().info('DecryptionWorker: decrypting: ' + item.id + ' (' + ItemClass.tableName() + ')');
					try {
						await ItemClass.decrypt(item);
					} catch (error) {
						excludedIds.push(item.id);
						
						if (error.code === 'masterKeyNotLoaded' && options.materKeyNotLoadedHandler === 'dispatch') {
							if (notLoadedMasterKeyDisptaches.indexOf(error.masterKeyId) < 0) {
								this.dispatch({
									type: 'MASTERKEY_ADD_NOT_LOADED',
									id: error.masterKeyId,
								});
								notLoadedMasterKeyDisptaches.push(error.masterKeyId);
							}
							continue;
						}

						if (error.code === 'masterKeyNotLoaded' && options.materKeyNotLoadedHandler === 'throw') {
							throw error;
						}

						this.logger().warn('DecryptionWorker: error for: ' + item.id + ' (' + ItemClass.tableName() + ')', error);
					}
				}

				if (!result.hasMore) break;
			}
		} catch (error) {
			this.logger().error('DecryptionWorker:', error);
			this.state_ = 'idle';
			throw error;
		}

		this.logger().info('DecryptionWorker: completed decryption.');

		this.state_ = 'idle';
	}

}

module.exports = DecryptionWorker;