import EncryptionService, { EncryptOptions } from '../e2ee/EncryptionService';
import { DecryptedNoteLockKey } from './NoteLockKey';
import NoteLockSession from './NoteLockSession';

export default class NoteLockService {

	public static instance_: NoteLockService = null;

	private constructor(
		private encryptionService_: EncryptionService,
		private keySource_: ()=> DecryptedNoteLockKey,
		private assertCanEncrypt_: (keyId: string)=> void,
	) {}

	public static instance() {
		if (!this.instance_) {
			const session = NoteLockSession.instance();
			this.instance_ = new NoteLockService(EncryptionService.instance(), () => session.decryptedKey(), keyId => session.assertCanEncryptWith(keyId));
		}
		return this.instance_;
	}

	// Decrypt reuses the key captured at scope start, since at-rest ciphertext doesn't change if the key rotates.
	// Encrypt is guarded by the session instead, so a lock alone won't interrupt it but a real rotation will.
	// Callers must await every scoped op: one that's started but not awaited still holds its captured key copy.
	public static async withDecryptedKey<T>(callback: (service: ScopedNoteLockService)=> Promise<T>) {
		const session = NoteLockSession.instance();
		const key = session.decryptedKey();
		const scoped = new NoteLockService(EncryptionService.instance(), () => key, keyId => session.assertCanEncryptWith(keyId));
		const scopedView: ScopedNoteLockService = {
			decryptString: cipherText => scoped.decryptString(cipherText),
			decryptFile: (srcPath, destPath) => scoped.decryptFile(srcPath, destPath),
			encryptString: plainText => scoped.encryptString(plainText),
			encryptFile: (srcPath, destPath) => scoped.encryptFile(srcPath, destPath),
		};
		try {
			return await callback(scopedView);
		} finally {
			scoped.revoke_();
		}
	}

	public static destroyInstance() {
		this.instance_ = null;
	}

	private revoke_() {
		this.keySource_ = () => { throw new Error('Note lock operation key is no longer available'); };
	}

	public async encryptString(plainText: string) {
		const key = this.keySource_();
		this.assertCanEncrypt_(key.id);
		const cipherText = await this.encryptionService_.encryptString(plainText, this.encryptionOptions_(key));
		this.assertCanEncrypt_(key.id);
		return cipherText;
	}

	public async decryptString(cipherText: string) {
		return this.encryptionService_.decryptString(cipherText, this.encryptionOptions_(this.keySource_()));
	}

	public async encryptFile(srcPath: string, destPath: string) {
		const key = this.keySource_();
		this.assertCanEncrypt_(key.id);
		await this.encryptionService_.encryptFile(srcPath, destPath, this.encryptionOptions_(key));
		try {
			this.assertCanEncrypt_(key.id);
		} catch (error) {
			await this.encryptionService_.fsDriver().unlink(destPath);
			throw error;
		}
	}

	public async decryptFile(srcPath: string, destPath: string) {
		return this.encryptionService_.decryptFile(srcPath, destPath, this.encryptionOptions_(this.keySource_()));
	}

	private encryptionOptions_(key: DecryptedNoteLockKey): EncryptOptions {
		return {
			masterKeyId: key.id,
			decryptedMasterKey: key.plainText,
		};
	}
}

export type ScopedNoteLockService = Pick<NoteLockService, 'encryptString' | 'encryptFile' | 'decryptString' | 'decryptFile'>;
