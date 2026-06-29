import EncryptionService, { EncryptOptions } from '../e2ee/EncryptionService';
import { DecryptedNoteLockKey } from './NoteLockKey';
import NoteLockSession from './NoteLockSession';

export default class NoteLockService {

	public static instance_: NoteLockService = null;

	private constructor(
		private encryptionService_: EncryptionService,
		private keySource_: ()=> DecryptedNoteLockKey,
	) {}

	public static instance() {
		if (!this.instance_) {
			const session = NoteLockSession.instance();
			this.instance_ = new NoteLockService(EncryptionService.instance(), () => session.decryptedKey());
		}
		return this.instance_;
	}

	// Decrypt-only by design: a scoped op reads at-rest data (which a key rotation mid-operation doesn't change)
	// but never writes, so it can't encrypt with a stale key — writes go through the live session and fail closed.
	// Callers must await every scoped op: one that's started but not awaited still holds its captured key copy.
	public static async withDecryptedKey<T>(callback: (service: ScopedNoteLockService)=> Promise<T>) {
		const key = NoteLockSession.instance().decryptedKey();
		const scoped = new NoteLockService(EncryptionService.instance(), () => key);
		const decryptView: ScopedNoteLockService = {
			decryptString: cipherText => scoped.decryptString(cipherText),
			decryptFile: (srcPath, destPath) => scoped.decryptFile(srcPath, destPath),
		};
		try {
			return await callback(decryptView);
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
		const key = this.keySource_();
		return {
			masterKeyId: key.id,
			decryptedMasterKey: key.plainText,
		};
	}
}

export type ScopedNoteLockService = Pick<NoteLockService, 'decryptString' | 'decryptFile'>;
