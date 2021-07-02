import BaseModel from '../BaseModel';
import { MasterKeyEntity } from '../services/database/types';
import { masterKeyAll, masterKeyById, saveMasterKey } from '../services/synchronizer/syncTargetInfoUtils';
import BaseItem from './BaseItem';

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

	static latest() {
		throw new Error('Not implemented');
		// return this.modelSelectOne('SELECT * FROM master_keys WHERE created_time >= (SELECT max(created_time) FROM master_keys)');
	}

	static allWithoutEncryptionMethod(masterKeys: MasterKeyEntity[], method: number) {
		return masterKeys.filter(m => m.encryption_method !== method);
	}

	public static async load(id: string): Promise<MasterKeyEntity> {
		return masterKeyById(id);
	}

	public static async allIds(): Promise<string[]> {
		return masterKeyAll().map(k => k.id);
	}

	public static async all(): Promise<MasterKeyEntity[]> {
		return masterKeyAll();
	}

	public static async save(o: MasterKeyEntity): Promise<MasterKeyEntity> {
		const newMasterKey = saveMasterKey(o);

		// this.dispatch({
		// 	type: 'MASTERKEY_UPDATE_ONE',
		// 	item: newMasterKey,
		// });

		return newMasterKey;
	}
}
