import { Buffer } from 'buffer';

const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

// TextDecoder handles ASCII chunks without Buffer's JavaScript string conversion.
// Fall back for high bytes to keep Buffer's existing 'ascii' semantics.
export default function decodeAsciiChunk(chunk: Buffer) {
	try {
		const text = utf8Decoder.decode(chunk);
		if (text.length === chunk.length) return text;
	} catch {
		// Invalid UTF-8 requires the Buffer fallback as well.
	}
	return chunk.toString('ascii');
}
