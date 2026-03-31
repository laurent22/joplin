import { renderHook } from '@testing-library/react';
import useRefocusOnDeletion from './useRefocusOnDeletion';

describe('useRefocusOnDeletion', () => {
	it('should refocus when a note is deleted in the same folder', () => {
		const focusNote = jest.fn();
		const { rerender } = renderHook(
			({ noteCount }: { noteCount: number }) =>
				useRefocusOnDeletion(noteCount, ['note-1'], '', 'folder-1', focusNote),
			{ initialProps: { noteCount: 3 } },
		);
		rerender({ noteCount: 2 });
		expect(focusNote).toHaveBeenCalledWith('note-1');
	});

	test.each([
		['note count increases', 2, 3, '', ['note-1']],
		['another field has focus', 3, 2, 'editor', ['note-1']],
		['multiple notes are selected', 3, 2, '', ['note-1', 'note-2']],
	])('should not refocus when %s', (_label, initialCount, newCount, focusedField, noteIds) => {
		const focusNote = jest.fn();
		const { rerender } = renderHook(
			({ noteCount }: { noteCount: number }) =>
				useRefocusOnDeletion(noteCount, noteIds, focusedField, 'folder-1', focusNote),
			{ initialProps: { noteCount: initialCount } },
		);
		rerender({ noteCount: newCount });
		expect(focusNote).not.toHaveBeenCalled();
	});

	it('should not refocus when switching to a folder with fewer notes', () => {
		const focusNote = jest.fn();
		const { rerender } = renderHook(
			({ noteCount, folderId }: { noteCount: number; folderId: string }) =>
				useRefocusOnDeletion(noteCount, ['note-1'], '', folderId, focusNote),
			{ initialProps: { noteCount: 3, folderId: 'folder-1' } },
		);
		rerender({ noteCount: 2, folderId: 'folder-2' });
		expect(focusNote).not.toHaveBeenCalled();
	});
});
