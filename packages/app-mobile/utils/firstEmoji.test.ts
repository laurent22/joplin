import firstEmoji from './firstEmoji';

describe('firstEmoji', () => {
	it.each([
		['', ''],
		['  ', ''],
		['plain text', ''],
		['  😀 😀  ', '😀'],
		['text 👩‍💻 🇬🇧', '👩‍💻'],
		['🇬🇧 🇫🇷', '🇬🇧'],
	])('selects the first emoji from %j', (input, expected) => {
		expect(firstEmoji(input)).toBe(expected);
	});
});
