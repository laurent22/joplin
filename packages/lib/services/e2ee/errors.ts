import { _ } from '../../locale';

const initializeErrorSubclass = (instance: any, clss: any) => {
	// See https://github.com/microsoft/TypeScript-wiki/blob/c1978865f2560a14aa6993b93a1b5c6383f7fed4/Breaking-Changes.md?plain=1#L2341
	Object.setPrototypeOf(instance, clss.prototype);

	// Also assume all error objects have a "code" property that they inherit
	instance.code = clss.code;
};

export class UnknownDecryptionMethodError extends Error {
	public static readonly code: string = 'UnknownDecryptionMethodError';
	public readonly code: string;

	public constructor(public readonly methodId: number) {
		super(_(
			'Unknown decryption method: %d. It is possible that the encrypted item was created with a newer version of this application.',
			methodId
		));

		initializeErrorSubclass(this, UnknownDecryptionMethodError);
	}
}

export class NoActiveMasterKeyError extends Error {
	public static readonly code: string = 'noActiveMasterKey';
	public readonly code: string;

	public constructor() {
		super('No master key is defined as active. Check this: Either one or more master keys exist but no password was provided for any of them. Or no master key exist. Or master keys and password exist, but none was set as active.');

		initializeErrorSubclass(this, NoActiveMasterKeyError);
	}
}
