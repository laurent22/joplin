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

		this.dispatch = () => {};

		this.scheduleId_ = null;
		this.eventEmitter_ = new EventEmitter();
		this.kvStore_ = null;
		this.maxDecryptionAttempts_ = 2;

		this.startCalls_ = [];
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
		if (DecryptionWorker.instance_) return DecryptionWorker.instance_;
		DecryptionWorker.instance_ = new DecryptionWorker();
		return DecryptionWorker.instance_;
	}

	setEncryptionService(v) {
		this.encryptionService_ = v;
	}

	setKvStore(v) {
		this.kvStore_ = v;
	}

	encryptionService() {
		if (!this.encryptionService_) throw new Error('DecryptionWorker.encryptionService_ is not set!!');
		return this.encryptionService_;
	}

	kvStore() {
		if (!this.kvStore_) throw new Error('DecryptionWorker.kvStore_ is not set!!');
		return this.kvStore_;
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

	async decryptionDisabledItems() {
		let items = await this.kvStore().searchByPrefix('decrypt:');
		items = items.filter(item => item.value > this.maxDecryptionAttempts_);
		items = items.map(item => {
			const s = item.key.split(':');
			return {
				type_: Number(s[1]),
				id: s[2],
			};
		});
		return items;
	}

	async clearDisabledItem(typeId, itemId) {
		await this.kvStore().deleteValue(`decrypt:${typeId}:${itemId}`);
	}

	dispatchReport(report) {
		const action = Object.assign({}, report);
		action.type = 'DECRYPTION_WORKER_SET';
		this.dispatch(action);
	}

	async start_(options = null) {
		if (options === null) options = {};
		if (!('masterKeyNotLoadedHandler' in options)) options.masterKeyNotLoadedHandler = 'throw';
		if (!('errorHandler' in options)) options.errorHandler = 'log';

		if (this.state_ !== 'idle') {
			this.logger().debug(`DecryptionWorker: cannot start because state is "${this.state_}"`);
			return;
		}

		// Note: the logic below is an optimisation to avoid going through the loop if no master key exists
		// or if none is loaded. It means this logic needs to be duplicate a bit what's in the loop, like the
		// "throw" and "dispatch" logic.
		const loadedMasterKeyCount = await this.encryptionService().loadedMasterKeysCount();
		if (!loadedMasterKeyCount) {
			this.logger().info('DecryptionWorker: cannot start because no master key is currently loaded.');
			const ids = await MasterKey.allIds();

			if (ids.length) {
				if (options.masterKeyNotLoadedHandler === 'throw') {
					// By trying to load the master key here, we throw the "masterKeyNotLoaded" error
					// which the caller needs.
					await this.encryptionService().loadedMasterKey(ids[0]);
				} else {
					this.dispatch({
						type: 'MASTERKEY_SET_NOT_LOADED',
						ids: ids,
					});
				}
			}
			return;
		}

		this.logger().info('DecryptionWorker: starting decryption...');

		this.state_ = 'started';

		let excludedIds = [];

		this.dispatch({ type: 'ENCRYPTION_HAS_DISABLED_ITEMS', value: false });
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

					const counterKey = `decrypt:${item.type_}:${item.id}`;

					const clearDecryptionCounter = async () => {
						await this.kvStore().deleteValue(counterKey);
					};

					// Don't log in production as it results in many messages when importing many items
					// this.logger().debug('DecryptionWorker: decrypting: ' + item.id + ' (' + ItemClass.tableName() + ')');
					try {
						const decryptCounter = await this.kvStore().incValue(counterKey);
						if (decryptCounter > this.maxDecryptionAttempts_) {
							this.logger().debug(`DecryptionWorker: ${item.id} decryption has failed more than 2 times - skipping it`);
							this.dispatch({ type: 'ENCRYPTION_HAS_DISABLED_ITEMS', value: true });
							excludedIds.push(item.id);
							continue;
						}

						const decryptedItem = await ItemClass.decrypt(item);

						await clearDecryptionCounter();

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
							await clearDecryptionCounter();
							continue;
						}

						if (error.code === 'masterKeyNotLoaded' && options.masterKeyNotLoadedHandler === 'throw') {
							await clearDecryptionCounter();
							throw error;
						}

						if (options.errorHandler === 'log') {
							this.logger().warn(`DecryptionWorker: error for: ${item.id} (${ItemClass.tableName()})`, error, item);
						} else {
							throw error;
						}
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
			this.logger().info(`DecryptionWorker: Some resources have been downloaded but are not decrypted yet. Scheduling another decryption. Resource count: ${downloadedButEncryptedBlobCount}`);
			this.scheduleStart();
		}
	}

	async start(options) {
		this.startCalls_.push(true);
		try {
			await this.start_(options);
		} finally {
			this.startCalls_.pop();
		}
	}

	async destroy() {
		this.eventEmitter_.removeAllListeners();
		if (this.scheduleId_) {
			clearTimeout(this.scheduleId_);
			this.scheduleId_ = null;
		}
		this.eventEmitter_ = null;
		DecryptionWorker.instance_ = null;

		return new Promise((resolve) => {
			const iid = setInterval(() => {
				if (!this.startCalls_.length) {
					clearInterval(iid);
					resolve();
				}
			}, 100);
		});
	}
}

DecryptionWorker.instance_ = null;

module.exports = DecryptionWorker;
