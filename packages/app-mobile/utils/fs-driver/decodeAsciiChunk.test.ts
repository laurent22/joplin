import { Buffer } from 'buffer';
import decodeAsciiChunk from './decodeAsciiChunk';

describe('decodeAsciiChunk', () => {
	it('decodes ASCII text', () => {
		expect(decodeAsciiChunk(Buffer.from('JED01abcdef'))).toBe('JED01abcdef');
	});

	it.each([
		['valid UTF-8', Buffer.from([0xc3, 0xa9])],
		['invalid UTF-8', Buffer.from([0x80, 0xff])],
	])('preserves Buffer ASCII semantics for high bytes in %s', (_description, bytes) => {
		expect(decodeAsciiChunk(bytes)).toBe(bytes.toString('ascii'));
	});

	it('returns an empty string for an empty chunk', () => {
		expect(decodeAsciiChunk(Buffer.alloc(0))).toBe('');
	});
});
