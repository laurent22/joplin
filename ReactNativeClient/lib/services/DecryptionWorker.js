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
			while (true) {
				const result = await BaseItem.itemsThatNeedDecryption(excludedIds);
				const items = result.items;

				for (let i = 0; i < items.length; i++) {
					const item = items[i];
					this.logger().debug('DecryptionWorker: decrypting: ' + item.id);
					const ItemClass = BaseItem.itemClass(item);
					try {
						await ItemClass.decrypt(item);
					} catch (error) {
						if (error.code === 'masterKeyNotLoaded' && options.materKeyNotLoadedHandler === 'dispatch') {
							excludedIds.push(item.id);
							this.dispatch({
								type: 'MASTERKEY_ADD_NOT_LOADED',
								id: error.masterKeyId,
							});
							continue;
						}
						throw error;
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