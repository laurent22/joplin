import uuid from '../../uuid';
import EncryptionService from '../e2ee/EncryptionService';
import { MasterKeyEntity } from '../e2ee/types';
import { localSyncInfo, saveLocalSyncInfo } from '../synchronizer/syncInfoUtils';

interface DecryptedNoteLockKey {
	id: string;
	plainText: string;
}

export default class NoteLockKey {

	public static instance_: NoteLockKey = null;

	private decryptedKey_: string = null;
	private keyId_: string = null;
	private unlockExpiryTimestamp_: number = null;

	private constructor(private encryptionService_: EncryptionService = EncryptionService.instance()) {}

	public static instance() {
		if (!this.instance_) {
			this.instance_ = new NoteLockKey();
		}
		return this.instance_;
	}

	public static destroyInstance() {
		this.instance_?.lock();
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

		if (this.keyId_ && this.keyId_ !== key.id) this.lock();

		return key;
	}

	public async create(password: string, unlockExpiryTimestamp: number = null) {
		if (this.load()) throw new Error('Note lock key already exists');
		return this.createNewKey_(password, unlockExpiryTimestamp);
	}

	public async reset(password: string, unlockExpiryTimestamp: number = null) {
		return this.createNewKey_(password, unlockExpiryTimestamp);
	}

	public async unlock(password: string, unlockExpiryTimestamp: number = null) {
		const key = this.load();
		if (!key) throw new Error('Note lock key has not been created');
		if (!key.id) throw new Error('Note lock key does not have an ID');

		const decryptedKey = await this.encryptionService_.decryptMasterKeyContent(key, password);
		this.keyId_ = key.id;
		this.decryptedKey_ = decryptedKey;
		this.unlockExpiryTimestamp_ = unlockExpiryTimestamp;
	}

	public lock() {
		this.keyId_ = null;
		this.decryptedKey_ = null;
		this.unlockExpiryTimestamp_ = null;
	}

	public isUnlocked() {
		this.invalidateExpiredKey_();
		if (this.keyId_ && this.keyId_ !== this.load()?.id) this.lock();
		return !!this.decryptedKey_;
	}

	public decryptedKey(): DecryptedNoteLockKey {
		if (!this.isUnlocked()) throw new Error('Note lock key is not unlocked');
		return {
			id: this.keyId_,
			plainText: this.decryptedKey_,
		};
	}

	private async createNewKey_(password: string, unlockExpiryTimestamp: number = null) {
		const key = this.save(await this.encryptionService_.generateMasterKey(password));
		await this.unlock(password, unlockExpiryTimestamp);
		return key;
	}

	private invalidateExpiredKey_() {
		if (this.unlockExpiryTimestamp_ !== null && this.unlockExpiryTimestamp_ <= Date.now()) this.lock();
	}
}
