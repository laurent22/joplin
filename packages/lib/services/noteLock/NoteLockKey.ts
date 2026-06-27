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
	private exportingCount_ = 0;
	private locked_ = true;

	private constructor(private encryptionService_: EncryptionService = EncryptionService.instance()) {}

	public static instance() {
		if (!this.instance_) {
			this.instance_ = new NoteLockKey();
		}
		return this.instance_;
	}

	public static destroyInstance() {
		this.instance_?.clearKey_();
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

		if (this.keyId_ && this.keyId_ !== key.id) this.clearKey_();

		return key;
	}

	public async create(password: string) {
		if (this.load()) throw new Error('Note lock key already exists');
		return this.createNewKey_(password);
	}

	public async reset(password: string) {
		return this.createNewKey_(password);
	}

	public async unlock(password: string) {
		const key = this.load();
		if (!key) throw new Error('Note lock key has not been created');
		if (!key.id) throw new Error('Note lock key does not have an ID');

		const decryptedKey = await this.encryptionService_.decryptMasterKeyContent(key, password);
		this.keyId_ = key.id;
		this.decryptedKey_ = decryptedKey;
		this.locked_ = false;
	}

	public lock() {
		this.locked_ = true;
		if (this.exportingCount_) return;
		this.clearKey_();
	}

	public startExport() {
		this.exportingCount_++;
	}

	public endExport() {
		this.exportingCount_ = Math.max(0, this.exportingCount_ - 1);
		if (!this.exportingCount_ && this.locked_) this.clearKey_();
	}

	private clearKey_() {
		this.keyId_ = null;
		this.decryptedKey_ = null;
		this.locked_ = true;
	}

	private lockIfKeyChanged_() {
		if (this.keyId_ && this.keyId_ !== this.load()?.id) this.lock();
	}

	public isUnlocked() {
		this.lockIfKeyChanged_();
		return !this.locked_ && !!this.decryptedKey_;
	}

	public decryptedKey(): DecryptedNoteLockKey {
		this.lockIfKeyChanged_();
		if (!this.decryptedKey_ || (!this.exportingCount_ && this.locked_)) throw new Error('Note lock key is not unlocked');
		return {
			id: this.keyId_,
			plainText: this.decryptedKey_,
		};
	}

	private async createNewKey_(password: string) {
		const key = this.save(await this.encryptionService_.generateMasterKey(password));
		await this.unlock(password);
		return key;
	}
}
