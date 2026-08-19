import buildRsaCryptoProvider from '@joplin/lib/services/e2ee/ppk/webCrypto/buildRsaCryptoProvider';
import { PublicKeyAlgorithm, PublicKeyCryptoProvider } from '@joplin/lib/services/e2ee/types';

const rsa: PublicKeyCryptoProvider = {
	[PublicKeyAlgorithm.Unknown]: null,
	[PublicKeyAlgorithm.RsaV1]: null, // Unsupported on web
	[PublicKeyAlgorithm.RsaV2]: buildRsaCryptoProvider(PublicKeyAlgorithm.RsaV2, crypto),
	[PublicKeyAlgorithm.RsaV3]: buildRsaCryptoProvider(PublicKeyAlgorithm.RsaV3, crypto),
};

export default rsa;
