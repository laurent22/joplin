import type { webcrypto } from 'node:crypto';
import { PublicKeyAlgorithm } from '../../types';
import StringToBufferWrapper from './StringToBufferWrapper';
import WebCryptoRsa, { WebCryptoSlice } from './WebCryptoRsa';
import LongDataWrapper from './LongDataWrapper';

const buildRsaCryptoProvider = (rsaMode: PublicKeyAlgorithm, crypto: WebCryptoSlice|typeof webcrypto) => {
	// Cast: Old versions of @types/node don't include crypto.subtle:
	const cryptoSlice = crypto as unknown as WebCryptoSlice;
	if (rsaMode === PublicKeyAlgorithm.RsaV2) {
		const keySizeBits = 2048;
		return new StringToBufferWrapper(
			new LongDataWrapper(
				new WebCryptoRsa(
					cryptoSlice,
					{ modulusLengthBits: keySizeBits },
				),
				keySizeBits / 8,
			),
		);
	} else if (rsaMode === PublicKeyAlgorithm.RsaV3) {
		return new StringToBufferWrapper(
			new WebCryptoRsa(
				cryptoSlice,
				{ modulusLengthBits: 4096 },
			),
		);
	} else {
		throw new Error(`Unsupported mode for webCrypto: ${rsaMode}`);
	}
};

export default buildRsaCryptoProvider;
