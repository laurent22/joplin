import lastEmoji from './lastEmoji';

describe('lastEmoji', () => {
	it.each([
		['', ''],
		['  ', ''],
		['plain text', ''],
		['  😀 😎  ', '😎'],
		['text 👩‍💻 🇬🇧', '🇬🇧'],
		['🇬🇧 🇫🇷', '🇫🇷'],
	])('selects the last emoji from %j', (input, expected) => {
		expect(lastEmoji(input)).toBe(expected);
	});
});
