import EncryptionService, { EncryptOptions } from '../e2ee/EncryptionService';
import NoteLockKey from './NoteLockKey';

export default class NoteLockService {

	public static instance_: NoteLockService = null;

	private constructor(
		private encryptionService_: EncryptionService,
		private noteLockKey_: NoteLockKey,
	) {}

	public static instance() {
		if (!this.instance_) {
			const encryptionService = EncryptionService.instance();
			const noteLockKey = NoteLockKey.instance();
			this.instance_ = new NoteLockService(encryptionService, noteLockKey);
		}
		return this.instance_;
	}

	public static destroyInstance() {
		this.instance_ = null;
	}

	public async encryptString(plainText: string) {
		return this.encryptionService_.encryptString(plainText, this.encryptionOptions_());
	}

	public async decryptString(cipherText: string) {
		return this.encryptionService_.decryptString(cipherText, this.encryptionOptions_());
	}

	public async encryptFile(srcPath: string, destPath: string) {
		return this.encryptionService_.encryptFile(srcPath, destPath, this.encryptionOptions_());
	}

	public async decryptFile(srcPath: string, destPath: string) {
		return this.encryptionService_.decryptFile(srcPath, destPath, this.encryptionOptions_());
	}

	private encryptionOptions_(): EncryptOptions {
		const key = this.noteLockKey_.decryptedKey();
		return {
			masterKeyId: key.id,
			decryptedMasterKey: key.plainText,
		};
	}
}
