import BaseItem, { ItemsThatNeedDecryptionResult } from '../models/BaseItem';
import BaseModel from '../BaseModel';
import MasterKey from '../models/MasterKey';
import Resource from '../models/Resource';
import ResourceService from './ResourceService';
import Logger from '@joplin/utils/Logger';
import shim from '../shim';
import KvStore from './KvStore';
import EncryptionService from './e2ee/EncryptionService';

const EventEmitter = require('events');

interface DecryptionResult {
	skippedItemCount?: number;
	decryptedItemCounts?: number;
	decryptedItemCount?: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	error: any;
}

export default class DecryptionWorker {

	public static instance_: DecryptionWorker = null;

	private state_ = 'idle';
	private logger_: Logger;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public dispatch: Function = () => {};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private scheduleId_: any = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private eventEmitter_: any;
	private kvStore_: KvStore = null;
	private maxDecryptionAttempts_ = 2;
	private startCalls_: boolean[] = [];
	private encryptionService_: EncryptionService = null;

	public constructor() {
		this.state_ = 'idle';
		this.logger_ = new Logger();
		this.eventEmitter_ = new EventEmitter();
	}

	public setLogger(l: Logger) {
		this.logger_ = l;
	}

	public logger() {
		return this.logger_;
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public on(eventName: string, callback: Function) {
		return this.eventEmitter_.on(eventName, callback);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public off(eventName: string, callback: Function) {
		return this.eventEmitter_.removeListener(eventName, callback);
	}

	public static instance() {
		if (DecryptionWorker.instance_) return DecryptionWorker.instance_;
		DecryptionWorker.instance_ = new DecryptionWorker();
		return DecryptionWorker.instance_;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public setEncryptionService(v: any) {
		this.encryptionService_ = v;
	}

	public setKvStore(v: KvStore) {
		this.kvStore_ = v;
	}

	public encryptionService() {
		if (!this.encryptionService_) throw new Error('DecryptionWorker.encryptionService_ is not set!!');
		return this.encryptionService_;
	}

	public kvStore() {
		if (!this.kvStore_) throw new Error('DecryptionWorker.kvStore_ is not set!!');
		return this.kvStore_;
	}

	public async scheduleStart() {
		if (this.scheduleId_) return;

		this.scheduleId_ = shim.setTimeout(() => {
			this.scheduleId_ = null;
			void this.start({
				masterKeyNotLoadedHandler: 'dispatch',
			});
		}, 1000);
	}

	public async decryptionDisabledItems() {
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

	public async clearDisabledItem(typeId: string, itemId: string) {
		await this.kvStore().deleteValue(`decrypt:${typeId}:${itemId}`);
	}

	public async clearDisabledItems() {
		await this.kvStore().deleteByPrefix('decrypt:');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public dispatchReport(report: any) {
		const action = { ...report };
		action.type = 'DECRYPTION_WORKER_SET';
		this.dispatch(action);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private async start_(options: any = null): Promise<DecryptionResult> {
		if (options === null) options = {};
		if (!('masterKeyNotLoadedHandler' in options)) options.masterKeyNotLoadedHandler = 'throw';
		if (!('errorHandler' in options)) options.errorHandler = 'log';

		if (this.state_ !== 'idle') {
			const msg = `DecryptionWorker: cannot start because state is "${this.state_}"`;
			this.logger().debug(msg);
			return { error: new Error(msg) };
		}

		// Note: the logic below is an optimisation to avoid going through the loop if no master key exists
		// or if none is loaded. It means this logic needs to be duplicate a bit what's in the loop, like the
		// "throw" and "dispatch" logic.
		const loadedMasterKeyCount = await this.encryptionService().loadedMasterKeysCount();
		if (!loadedMasterKeyCount) {
			const msg = 'DecryptionWorker: cannot start because no master key is currently loaded.';
			this.logger().info(msg);
			const ids = await MasterKey.allIds();

			// Note that the current implementation means that a warning will be
			// displayed even if the user has no encrypted note. Just having
			// encrypted master key is sufficient. Not great but good enough for
			// now.

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
			return { error: new Error(msg) };
		}

		this.logger().info('DecryptionWorker: starting decryption...');

		this.state_ = 'started';

		const excludedIds = [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const decryptedItemCounts: any = {};
		let skippedItemCount = 0;

		this.dispatch({ type: 'ENCRYPTION_HAS_DISABLED_ITEMS', value: false });
		this.dispatchReport({ state: 'started' });

		try {
			const notLoadedMasterKeyDispatches = [];

			while (true) {
				const result: ItemsThatNeedDecryptionResult = await BaseItem.itemsThatNeedDecryption(excludedIds);
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
							this.logger().debug(`DecryptionWorker: ${BaseModel.modelTypeToName(item.type_)} ${item.id}: Decryption has failed more than 2 times - skipping it`);
							this.dispatch({ type: 'ENCRYPTION_HAS_DISABLED_ITEMS', value: true });
							skippedItemCount++;
							excludedIds.push(item.id);
							continue;
						}

						const decryptedItem = await ItemClass.decrypt(item);

						await clearDecryptionCounter();

						if (!decryptedItemCounts[decryptedItem.type_]) decryptedItemCounts[decryptedItem.type_] = 0;

						decryptedItemCounts[decryptedItem.type_]++;

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
							if (notLoadedMasterKeyDispatches.indexOf(error.masterKeyId) < 0) {
								this.dispatch({
									type: 'MASTERKEY_ADD_NOT_LOADED',
									id: error.masterKeyId,
								});
								notLoadedMasterKeyDispatches.push(error.masterKeyId);
							}
							await clearDecryptionCounter();
							continue;
						}

						if (error.code === 'masterKeyNotLoaded' && options.masterKeyNotLoadedHandler === 'throw') {
							await clearDecryptionCounter();
							throw error;
						}

						if (options.errorHandler === 'log') {
							this.logger().warn(`DecryptionWorker: error for: ${item.id} (${ItemClass.tableName()})`, error);
							this.logger().debug('Item with error:', item);
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

		const downloadedButEncryptedBlobCount = await Resource.downloadedButEncryptedBlobCount(excludedIds);

		this.state_ = 'idle';

		let decryptedItemCount = 0;
		for (const itemType in decryptedItemCounts) decryptedItemCount += decryptedItemCounts[itemType];

		const finalReport: DecryptionResult = {
			skippedItemCount: skippedItemCount,
			decryptedItemCounts: decryptedItemCounts,
			decryptedItemCount: decryptedItemCount,
			error: null,
		};

		this.dispatchReport({ ...finalReport, state: 'idle' });

		if (downloadedButEncryptedBlobCount) {
			this.logger().info(`DecryptionWorker: Some resources have been downloaded but are not decrypted yet. Scheduling another decryption. Resource count: ${downloadedButEncryptedBlobCount}`);
			void this.scheduleStart();
		}

		return finalReport;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async start(options: any = {}) {
		this.startCalls_.push(true);
		let output = null;
		try {
			output = await this.start_(options);
		} finally {
			this.startCalls_.pop();
		}
		return output;
	}

	public async destroy() {
		this.eventEmitter_.removeAllListeners();
		if (this.scheduleId_) {
			shim.clearTimeout(this.scheduleId_);
			this.scheduleId_ = null;
		}
		this.eventEmitter_ = null;
		DecryptionWorker.instance_ = null;

		return new Promise((resolve) => {
			const iid = shim.setInterval(() => {
				if (!this.startCalls_.length) {
					shim.clearInterval(iid);
					resolve(null);
				}
			}, 100);
		});
	}
}
