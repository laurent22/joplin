const BaseItem = require('lib/models/BaseItem');
const MasterKey = require('lib/models/MasterKey');
const Resource = require('lib/models/Resource');
const ResourceService = require('lib/services/ResourceService');
const { Logger } = require('lib/logger.js');
const EventEmitter = require('events');

class DecryptionWorker {

	constructor() {
		this.state_ = 'idle';
		this.logger_ = new Logger();

		this.dispatch = (action) => {
			//console.warn('DecryptionWorker.dispatch is not defined');
		};

		this.scheduleId_ = null;
		this.eventEmitter_ = new EventEmitter();
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	on(eventName, callback) {
		return this.eventEmitter_.on(eventName, callback);
	}

	off(eventName, callback) {
		return this.eventEmitter_.removeListener(eventName, callback);
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
				masterKeyNotLoadedHandler: 'dispatch',
			});
		}, 1000);
	}

	dispatchReport(report) {
		const action = Object.assign({}, report);
		action.type = 'DECRYPTION_WORKER_SET';
		this.dispatch(action);
	}

	async start(options = null) {
		if (options === null) options = {};
		if (!('masterKeyNotLoadedHandler' in options)) options.masterKeyNotLoadedHandler = 'throw';

		if (this.state_ !== 'idle') {
			this.logger().info('DecryptionWorker: cannot start because state is "' + this.state_ + '"');
			return;
		}

		const loadedMasterKeyCount = await this.encryptionService().loadedMasterKeysCount();
		if (!loadedMasterKeyCount) {
			this.logger().info('DecryptionWorker: cannot start because no master key is currently loaded.');
			const ids = await MasterKey.allIds();

			if (ids.length) {
				this.dispatch({
					type: 'MASTERKEY_SET_NOT_LOADED',
					ids: ids,
				});
			}
			return;
		}

		this.logger().info('DecryptionWorker: starting decryption...');

		this.state_ = 'started';

		let excludedIds = [];

		this.dispatchReport({ state: 'started' });

		try {
			const notLoadedMasterKeyDisptaches = [];

			while (true) {
				const result = await BaseItem.itemsThatNeedDecryption(excludedIds);
				const items = result.items;

				for (let i = 0; i < items.length; i++) {
					const item = items[i];

					const ItemClass = BaseItem.itemClass(item);

					this.dispatchReport({
						itemIndex: i,
						itemCount: items.length,
					});
					
					// Don't log in production as it results in many messages when importing many items
					// this.logger().debug('DecryptionWorker: decrypting: ' + item.id + ' (' + ItemClass.tableName() + ')');
					try {
						const decryptedItem = await ItemClass.decrypt(item);

						if (decryptedItem.type_ === Resource.modelType() && !!decryptedItem.encryption_blob_encrypted) {
							// itemsThatNeedDecryption() will return the resource again if the blob has not been decrypted,
							// but that will result in an infinite loop if the blob simply has not been downloaded yet.
							// So skip the ID for now, and the service will try to decrypt the blob again the next time. 
							excludedIds.push(decryptedItem.id);
						}

						if (decryptedItem.type_ === Resource.modelType() && !decryptedItem.encryption_blob_encrypted) {
							this.eventEmitter_.emit('resourceDecrypted', { id: decryptedItem.id });
						}

						if (decryptedItem.type_ === Resource.modelType() && !decryptedItem.encryption_applied && !!decryptedItem.encryption_blob_encrypted) {
							this.eventEmitter_.emit('resourceMetadataButNotBlobDecrypted', { id: decryptedItem.id });
						}
					} catch (error) {
						excludedIds.push(item.id);

						if (error.code === 'masterKeyNotLoaded' && options.masterKeyNotLoadedHandler === 'dispatch') {
							if (notLoadedMasterKeyDisptaches.indexOf(error.masterKeyId) < 0) {
								this.dispatch({
									type: 'MASTERKEY_ADD_NOT_LOADED',
									id: error.masterKeyId,
								});
								notLoadedMasterKeyDisptaches.push(error.masterKeyId);
							}
							continue;
						}

						if (error.code === 'masterKeyNotLoaded' && options.masterKeyNotLoadedHandler === 'throw') {
							throw error;
						}

						this.logger().warn('DecryptionWorker: error for: ' + item.id + ' (' + ItemClass.tableName() + ')', error, item);
					}
				}

				if (!result.hasMore) break;
			}
		} catch (error) {
			this.logger().error('DecryptionWorker:', error);
			this.state_ = 'idle';
			this.dispatchReport({ state: 'idle' });
			throw error;
		}

		// 2019-05-12: Temporary to set the file size of the resources
		// that weren't set in migration/20.js due to being on the sync target
		await ResourceService.autoSetFileSizes();

		this.logger().info('DecryptionWorker: completed decryption.');

		const downloadedButEncryptedBlobCount = await Resource.downloadedButEncryptedBlobCount();

		this.state_ = 'idle';

		this.dispatchReport({ state: 'idle' });

		if (downloadedButEncryptedBlobCount) {
			this.logger().info('DecryptionWorker: Some resources have been downloaded but are not decrypted yet. Scheduling another decryption. Resource count: ' + downloadedButEncryptedBlobCount);
			this.scheduleStart();
		}
	}

}

module.exports = DecryptionWorker;