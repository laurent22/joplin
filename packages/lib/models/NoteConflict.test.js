const Note = require('./Note.js').default;

describe('Note.mustHandleConflict', () => {

	const createNoteMock = (id, title, body, encryption_cipher_text) => {
		return {
			id,
			title,
			body,
			encryption_cipher_text,
		};
	};

	it('should throw an error if note IDs are different', () => {
		const localNote = createNoteMock('id1', 'title', 'body', '');
		const remoteNote = createNoteMock('id2', 'title', 'body', '');
		expect(() => Note.mustHandleConflict(localNote, remoteNote)).toThrow('Cannot handle conflict for two different notes');
	});

	it('should return true if only the local note is encrypted', () => {
		const localNote = createNoteMock('id1', 'title', 'body', 'encrypted_text');
		const remoteNote = createNoteMock('id1', 'title', 'body', '');
		expect(Note.mustHandleConflict(localNote, remoteNote)).toBe(true);
	});

	it('should return true if only the remote note is encrypted', () => {
		const localNote = createNoteMock('id1', 'title', 'body', '');
		const remoteNote = createNoteMock('id1', 'title', 'body', 'encrypted_text');
		expect(Note.mustHandleConflict(localNote, remoteNote)).toBe(true);
	});


	it('should return true if titles are different', () => {
		const localNote = createNoteMock('id1', 'local title', 'body', '');
		const remoteNote = createNoteMock('id1', 'remote title', 'body', '');
		expect(Note.mustHandleConflict(localNote, remoteNote)).toBe(true);
	});

	it('should return true if bodies are different', () => {
		const localNote = createNoteMock('id1', 'title', 'local body', '');
		const remoteNote = createNoteMock('id1', 'title', 'remote body', '');
		expect(Note.mustHandleConflict(localNote, remoteNote)).toBe(true);
	});

	it('should return false if there are no relevant differences', () => {
		const localNote = createNoteMock('id1', 'title', 'body', '');
		const remoteNote = createNoteMock('id1', 'title', 'body', '');
		expect(Note.mustHandleConflict(localNote, remoteNote)).toBe(false);
	});
});
