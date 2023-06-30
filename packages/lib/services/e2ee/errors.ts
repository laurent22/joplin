import { _ } from '../../locale';

export class UnknownDecryptionMethodError extends Error {
	public readonly code: string = 'UnknownDecryptionMethodError';

	public constructor(public readonly methodId: number) {
		super(_(
			'Unknown decryption method: %d. It is possible that the encrypted item was created with a newer version of this application.',
			methodId
		));

		// See https://github.com/microsoft/TypeScript-wiki/blob/c1978865f2560a14aa6993b93a1b5c6383f7fed4/Breaking-Changes.md?plain=1#L2341
		Object.setPrototypeOf(this, UnknownDecryptionMethodError.prototype);
	}
}

export class UnknownEncryptionMethodError extends Error {
	public constructor(public readonly methodId: number) {
		super(`Unknown encryption method: ${methodId}`);

		Object.setPrototypeOf(this, UnknownEncryptionMethodError.prototype);
	}
}
