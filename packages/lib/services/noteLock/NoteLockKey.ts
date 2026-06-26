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
	private exporting_ = false;
	private locked_ = true;

	private constructor(private encryptionService_: EncryptionService = EncryptionService.instance()) {}

	public static instance() {
		if (!this.instance_) {
			this.instance_ = new NoteLockKey();
		}
		return this.instance_;
	}

	public static destroyInstance() {
		this.instance_?.setExporting(false);
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
		if (this.exporting_) return;
		this.clearKey_();
	}

	public setExporting(exporting: boolean) {
		this.exporting_ = exporting;
		if (!this.exporting_ && this.locked_) this.clearKey_();
	}

	private clearKey_() {
		this.keyId_ = null;
		this.decryptedKey_ = null;
		this.locked_ = true;
	}

	private clearKeyIfChanged_() {
		if (this.keyId_ && this.keyId_ !== this.load()?.id) this.clearKey_();
	}

	public isUnlocked() {
		this.clearKeyIfChanged_();
		if (!this.exporting_ && this.locked_ && this.decryptedKey_) this.clearKey_();
		return !this.locked_ && !!this.decryptedKey_;
	}

	public decryptedKey(): DecryptedNoteLockKey {
		this.clearKeyIfChanged_();
		if (!this.exporting_ && !this.isUnlocked()) throw new Error('Note lock key is not unlocked');
		if (!this.decryptedKey_) throw new Error('Note lock key is not unlocked');
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
