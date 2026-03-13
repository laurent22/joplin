import { renderHook } from '@testing-library/react';
import useRefocusOnDeletion from './useRefocusOnDeletion';

describe('useRefocusOnDeletion', () => {
	it('should call focusNote when a note is removed and note list has focus', () => {
		const focusNote = jest.fn();
		const { rerender } = renderHook(
			({ noteCount }: { noteCount: number }) =>
				useRefocusOnDeletion(noteCount, ['note-2'], '', 'folder-1', focusNote),
			{ initialProps: { noteCount: 3 } },
		);
		rerender({ noteCount: 2 });
		expect(focusNote).toHaveBeenCalledWith('note-2');
	});

	it('should not call focusNote when another field has focus', () => {
		const focusNote = jest.fn();
		const { rerender } = renderHook(
			({ noteCount }: { noteCount: number }) =>
				useRefocusOnDeletion(noteCount, ['note-2'], 'editor', 'folder-1', focusNote),
			{ initialProps: { noteCount: 3 } },
		);
		rerender({ noteCount: 2 });
		expect(focusNote).not.toHaveBeenCalled();
	});

	it('should not call focusNote when note count increases', () => {
		const focusNote = jest.fn();
		const { rerender } = renderHook(
			({ noteCount }: { noteCount: number }) =>
				useRefocusOnDeletion(noteCount, ['note-1'], '', 'folder-1', focusNote),
			{ initialProps: { noteCount: 2 } },
		);
		rerender({ noteCount: 3 });
		expect(focusNote).not.toHaveBeenCalled();
	});

	it('should not call focusNote when multiple notes are selected', () => {
		const focusNote = jest.fn();
		const { rerender } = renderHook(
			({ noteCount }: { noteCount: number }) =>
				useRefocusOnDeletion(noteCount, ['note-1', 'note-2'], '', 'folder-1', focusNote),
			{ initialProps: { noteCount: 3 } },
		);
		rerender({ noteCount: 2 });
		expect(focusNote).not.toHaveBeenCalled();
	});

	it('should not call focusNote when switching to a folder with fewer notes', () => {
		const focusNote = jest.fn();
		const { rerender } = renderHook(
			({ noteCount, selectedFolderId }: { noteCount: number; selectedFolderId: string }) =>
				useRefocusOnDeletion(noteCount, ['note-1'], '', selectedFolderId, focusNote),
			{ initialProps: { noteCount: 3, selectedFolderId: 'folder-1' } },
		);
		rerender({ noteCount: 2, selectedFolderId: 'folder-2' });
		expect(focusNote).not.toHaveBeenCalled();
	});
});
