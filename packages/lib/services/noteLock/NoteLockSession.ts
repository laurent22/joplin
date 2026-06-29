import NoteLockKey, { DecryptedNoteLockKey } from './NoteLockKey';

export default class NoteLockSession {

	public static instance_: NoteLockSession = null;

	private key_: DecryptedNoteLockKey = null;
	private lockGeneration_ = 0;
	private rotating_ = false;

	private constructor(private noteLockKey_: NoteLockKey = NoteLockKey.instance()) {}

	public static instance() {
		if (!this.instance_) {
			this.instance_ = new NoteLockSession();
		}
		return this.instance_;
	}

	public static destroyInstance() {
		// lock() bumps the generation so a mid-decrypt unlock() cannot repopulate a torn-down session.
		this.instance_?.lock();
		this.instance_ = null;
	}

	// Re-checks state after the await so a lock, reset, synced change or teardown that raced in can't install a stale key.
	public async unlock(password: string) {
		if (this.rotating_) return false;
		const generation = this.lockGeneration_;
		const decrypted = await this.noteLockKey_.decrypt(password);
		if (this.rotating_ || this.lockGeneration_ !== generation || this.noteLockKey_.load()?.id !== decrypted.id) return false;
		this.key_ = decrypted;
		return true;
	}

	public lock() {
		this.lockGeneration_++;
		this.key_ = null;
	}

	// Blocks unlock during rotation so the still-persisted old key can't be unlocked before the new one is saved.
	public async reset(password: string) {
		if (this.rotating_) throw new Error('A note lock key reset is already in progress');
		this.rotating_ = true;
		this.lock();
		try {
			return await this.noteLockKey_.reset(password);
		} finally {
			this.lock();
			this.rotating_ = false;
		}
	}

	private lockIfKeyChanged_() {
		if (this.key_ && this.key_.id !== this.noteLockKey_.load()?.id) this.lock();
	}

	public isUnlocked() {
		this.lockIfKeyChanged_();
		return !!this.key_;
	}

	public decryptedKey(): DecryptedNoteLockKey {
		this.lockIfKeyChanged_();
		if (!this.key_) throw new Error('Note lock session is locked');
		return {
			id: this.key_.id,
			plainText: this.key_.plainText,
		};
	}
}
