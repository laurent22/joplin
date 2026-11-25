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

	it.each([
		['😎😀', '😀', '😎'],
		['😀😎', '😀', '😎'],
		['😀a', '😀', '😀'],
		['😎😀🇬🇧', '😀', '🇬🇧'],
		['text 👩‍💻 🇬🇧', '😀', '🇬🇧'],
	])('prefers the last newly inserted emoji in %j', (input, previousEmoji, expected) => {
		expect(lastEmoji(input, previousEmoji)).toBe(expected);
	});
});
