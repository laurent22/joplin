import BaseModel from '../BaseModel';
import { MasterKeyEntity } from '../services/e2ee/types';
import { localSyncInfo, saveLocalSyncInfo } from '../services/synchronizer/syncInfoUtils';
import BaseItem from './BaseItem';
import uuid from '../uuid';

export default class MasterKey extends BaseItem {
	static tableName() {
		return 'master_keys';
	}

	static modelType() {
		return BaseModel.TYPE_MASTER_KEY;
	}

	static encryptionSupported() {
		return false;
	}

	public static latest() {
		let output: MasterKeyEntity = null;
		const syncInfo = localSyncInfo();
		for (const mk of syncInfo.masterKeys) {
			if (!output || output.updated_time < mk.updated_time) {
				output = mk;
			}
		}
		return output;
		// return this.modelSelectOne('SELECT * FROM master_keys WHERE created_time >= (SELECT max(created_time) FROM master_keys)');
	}

	static allWithoutEncryptionMethod(masterKeys: MasterKeyEntity[], method: number) {
		return masterKeys.filter(m => m.encryption_method !== method);
	}

	public static async all(): Promise<MasterKeyEntity[]> {
		return localSyncInfo().masterKeys;
	}

	public static async allIds(): Promise<string[]> {
		return localSyncInfo().masterKeys.map(k => k.id);
	}

	public static async count(): Promise<number> {
		return localSyncInfo().masterKeys.length;
	}

	public static async load(id: string): Promise<MasterKeyEntity> {
		return localSyncInfo().masterKeys.find(mk => mk.id === id);
	}

	public static async save(o: MasterKeyEntity): Promise<MasterKeyEntity> {
		const syncInfo = localSyncInfo();

		const masterKey = { ...o };
		if (!masterKey.id) {
			masterKey.id = uuid.create();
			masterKey.created_time = Date.now();
		}

		masterKey.updated_time = Date.now();

		const idx = syncInfo.masterKeys.findIndex(mk => mk.id === masterKey.id);

		if (idx >= 0) {
			syncInfo.masterKeys[idx] = masterKey;
		} else {
			syncInfo.masterKeys.push(masterKey);
		}

		saveLocalSyncInfo(syncInfo);

		this.dispatch({
			type: 'MASTERKEY_UPDATE_ONE',
			item: masterKey,
		});

		return masterKey;

		// return super.save(o, options).then(item => {
		// 	this.dispatch({
		// 		type: 'MASTERKEY_UPDATE_ONE',
		// 		item: item,
		// 	});
		// 	return item;
		// });
	}
}
