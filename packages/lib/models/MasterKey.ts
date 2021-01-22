import BaseModel from '../BaseModel';
import { MasterKeyEntity } from '../services/database/types';
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
		return this.modelSelectOne('SELECT * FROM master_keys WHERE created_time >= (SELECT max(created_time) FROM master_keys)');
	}

	static allWithoutEncryptionMethod(masterKeys: MasterKeyEntity[], method: number) {
		return masterKeys.filter(m => m.encryption_method !== method);
	}

	static async save(o: MasterKeyEntity, options: any = null) {
		return super.save(o, options).then(item => {
			this.dispatch({
				type: 'MASTERKEY_UPDATE_ONE',
				item: item,
			});
			return item;
		});
	}
}
