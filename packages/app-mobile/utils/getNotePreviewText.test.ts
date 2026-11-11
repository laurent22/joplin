import getNotePreviewText from './getNotePreviewText';

describe('getNotePreviewText', () => {
	test('should return an empty string for an empty body', () => {
		expect(getNotePreviewText('')).toBe('');
		expect(getNotePreviewText(undefined)).toBe('');
	});

	test('should strip Markdown syntax', () => {
		const body = '# Title\n\n- [ ] **bold** item\n- [link](https://example.com) and ![img](:/abc123)\n\n> quote';
		expect(getNotePreviewText(body)).toBe('Title bold item link and quote');
	});

	test('should truncate long bodies', () => {
		const result = getNotePreviewText('a'.repeat(500), 50);
		expect(result).toBe(`${'a'.repeat(50)}…`);
	});
});
