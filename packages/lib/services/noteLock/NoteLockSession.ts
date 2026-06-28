import NoteLockKey, { DecryptedNoteLockKey } from './NoteLockKey';

export default class NoteLockSession {

	public static instance_: NoteLockSession = null;

	private decryptedKey_: string = null;
	private keyId_: string = null;
	private leaseCount_ = 0;
	private locked_ = true;

	private constructor(private noteLockKey_: NoteLockKey = NoteLockKey.instance()) {}

	public static instance() {
		if (!this.instance_) {
			this.instance_ = new NoteLockSession();
		}
		return this.instance_;
	}

	public static destroyInstance() {
		this.instance_?.clearKey_();
		this.instance_ = null;
	}

	public async unlock(password: string) {
		if (this.leaseCount_) throw new Error('Cannot unlock the note lock session while an operation is holding the key');
		const decrypted = await this.noteLockKey_.decrypt(password);
		this.keyId_ = decrypted.id;
		this.decryptedKey_ = decrypted.plainText;
		this.locked_ = false;
	}

	public lock() {
		this.locked_ = true;
		if (this.leaseCount_) return;
		this.clearKey_();
	}

	// Holds the decrypted key for the duration of the callback if the session locks or the synced
	// key changes meanwhile. A key change that happened before the lease starts is not deferred, so
	// it is applied first and the lease then runs on a locked session. The key is only cleared once
	// the final lease ends.
	public async withKeyHeld<T>(callback: ()=> Promise<T>): Promise<T> {
		this.lockIfKeyChanged_();
		this.leaseCount_++;
		try {
			return await callback();
		} finally {
			this.leaseCount_ = Math.max(0, this.leaseCount_ - 1);
			if (!this.leaseCount_ && this.locked_) this.clearKey_();
			this.lockIfKeyChanged_();
		}
	}

	private clearKey_() {
		this.keyId_ = null;
		this.decryptedKey_ = null;
		this.locked_ = true;
	}

	private lockIfKeyChanged_() {
		if (this.keyId_ && this.keyId_ !== this.noteLockKey_.load()?.id) this.lock();
	}

	public isUnlocked() {
		this.lockIfKeyChanged_();
		return !this.locked_ && !!this.decryptedKey_;
	}

	public decryptedKey(): DecryptedNoteLockKey {
		this.lockIfKeyChanged_();
		if (!this.decryptedKey_ || (!this.leaseCount_ && this.locked_)) throw new Error('Note lock session is locked');
		return {
			id: this.keyId_,
			plainText: this.decryptedKey_,
		};
	}
}
