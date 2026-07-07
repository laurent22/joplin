import uuid from '../../uuid';
import EncryptionService from '../e2ee/EncryptionService';
import { MasterKeyEntity } from '../e2ee/types';
import { localSyncInfo, saveLocalSyncInfo } from '../synchronizer/syncInfoUtils';

export interface DecryptedNoteLockKey {
	id: string;
	plainText: string;
}

export default class NoteLockKey {

	public static instance_: NoteLockKey = null;

	private constructor(private encryptionService_: EncryptionService = EncryptionService.instance()) {}

	public static instance() {
		if (!this.instance_) {
			this.instance_ = new NoteLockKey();
		}
		return this.instance_;
	}

	public static destroyInstance() {
		this.instance_ = null;
	}

	public load(): MasterKeyEntity {
		return localSyncInfo().noteLockKey;
	}

	public save(o: MasterKeyEntity): MasterKeyEntity {
		const key = { ...o };
		if (!key.id) {
			key.id = uuid.create();
			key.created_time = Date.now();
		}
		key.updated_time = Date.now();

		const syncInfo = localSyncInfo();
		syncInfo.noteLockKey = key;
		saveLocalSyncInfo(syncInfo);

		return key;
	}

	public async create(password: string) {
		if (this.load()) throw new Error('Note lock key already exists');
		return this.save(await this.encryptionService_.generateMasterKey(password));
	}

	// Rotate through NoteLockSession.reset() rather than calling this directly, so the session locks
	// and drops the old key as part of the rotation.
	public async reset(password: string) {
		return this.save(await this.encryptionService_.generateMasterKey(password));
	}

	public async decrypt(password: string): Promise<DecryptedNoteLockKey> {
		const key = this.load();
		if (!key) throw new Error('Note lock key has not been created');
		if (!key.id) throw new Error('Note lock key does not have an ID');

		const plainText = await this.encryptionService_.decryptMasterKeyContent(key, password);
		return { id: key.id, plainText };
	}
}
