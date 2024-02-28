import normalizeAccelerator from './normalizeAccelerator';

describe('normalizeAccelerator', () => {
	test.each([
		{ original: 'Z', expected: 'z' },
		{ original: 'Alt+A', expected: 'Alt-a' },
		{ original: 'Shift+A', expected: 'Shift-a' },
	])('should convert key names to lowercase (%j)', ({ original, expected }) => {
		expect(normalizeAccelerator(original)).toBe(expected);
	});
});
