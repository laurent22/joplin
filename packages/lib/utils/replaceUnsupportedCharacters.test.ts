import replaceUnsupportedCharacters from './replaceUnsupportedCharacters';

describe('replaceUnsupportedCharacters', () => {
	test('should replace NULL characters', () => {
		expect(replaceUnsupportedCharacters('Test\x00...')).toBe('Test\uFFFD...');
		expect(replaceUnsupportedCharacters('\x00Test\x00...')).toBe('\uFFFDTest\uFFFD...');
	});

	test('should replace directional isolate characters (LRI, RLI, FSI, PDI)', () => {
		expect(replaceUnsupportedCharacters('Test\u2066...')).toBe('Test\uFFFD...');
		expect(replaceUnsupportedCharacters('\u2067Test\u2069')).toBe('\uFFFDTest\uFFFD');
		expect(replaceUnsupportedCharacters('\u2068text')).toBe('\uFFFDtext');
		expect(replaceUnsupportedCharacters('text\u2069')).toBe('text\uFFFD');
		expect(replaceUnsupportedCharacters('\u2066\u2067\u2068\u2069')).toBe('\uFFFD\uFFFD\uFFFD\uFFFD');
	});

	test('should handle mixed NULL and directional isolate characters', () => {
		expect(replaceUnsupportedCharacters('\x00\u2066test\u2069\x00')).toBe('\uFFFD\uFFFDtest\uFFFD\uFFFD');
	});
});
