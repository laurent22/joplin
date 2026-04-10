import { renderHook } from '@testing-library/react';
import { focus } from '@joplin/lib/utils/focusHandler';
import useRefocusOnDeletion from './useRefocusOnDeletion';

const createFocusContext = () => {
	const listElement = document.createElement('div');
	const listItem = document.createElement('button');
	listElement.appendChild(listItem);
	document.body.appendChild(listElement);

	const editor = document.createElement('textarea');
	document.body.appendChild(editor);

	return {
		listRef: { current: listElement },
		listItem,
		editor,
		cleanup: () => {
			listElement.remove();
			editor.remove();
		},
	};
};

describe('useRefocusOnDeletion', () => {
	it('should refocus when a note is deleted in the same folder and note list has focus', () => {
		const { listRef, listItem, cleanup } = createFocusContext();
		const focusNote = jest.fn();

		try {
			const { rerender } = renderHook(
				({ noteCount }: { noteCount: number }) =>
					useRefocusOnDeletion(noteCount, ['note-1'], '', 'folder-1', listRef, focusNote),
				{ initialProps: { noteCount: 3 } },
			);

			focus('useRefocusOnDeletion.test/listItem', listItem);
			rerender({ noteCount: 2 });
			expect(focusNote).toHaveBeenCalledWith('note-1');
		} finally {
			cleanup();
		}
	});

	test.each([
		['note count increases', 2, 3, '', ['note-1']],
		['another field has focus', 3, 2, 'editor', ['note-1']],
		['multiple notes are selected', 3, 2, '', ['note-1', 'note-2']],
	])('should not refocus when %s', (_label, initialCount, newCount, focusedField, noteIds) => {
		const { listRef, listItem, cleanup } = createFocusContext();
		const focusNote = jest.fn();

		try {
			const { rerender } = renderHook(
				({ noteCount }: { noteCount: number }) =>
					useRefocusOnDeletion(noteCount, noteIds, focusedField, 'folder-1', listRef, focusNote),
				{ initialProps: { noteCount: initialCount } },
			);

			focus('useRefocusOnDeletion.test/listItem', listItem);
			rerender({ noteCount: newCount });
			expect(focusNote).not.toHaveBeenCalled();
		} finally {
			cleanup();
		}
	});

	it('should not refocus while editor has focus during background note deletion', () => {
		const { listRef, editor, cleanup } = createFocusContext();
		const focusNote = jest.fn();

		try {
			const { rerender } = renderHook(
				({ noteCount }: { noteCount: number }) =>
					useRefocusOnDeletion(noteCount, ['note-1'], '', 'folder-1', listRef, focusNote),
				{ initialProps: { noteCount: 3 } },
			);

			focus('useRefocusOnDeletion.test/editor', editor);
			rerender({ noteCount: 2 });
			expect(focusNote).not.toHaveBeenCalled();
		} finally {
			cleanup();
		}
	});

	it('should not refocus when switching to a folder with fewer notes across two rerenders', () => {
		const { listRef, listItem, cleanup } = createFocusContext();
		const focusNote = jest.fn();

		try {
			const { rerender } = renderHook(
				({ noteCount, folderId }: { noteCount: number; folderId: string }) =>
					useRefocusOnDeletion(noteCount, ['note-1'], '', folderId, listRef, focusNote),
				{ initialProps: { noteCount: 3, folderId: 'folder-1' } },
			);
			focus('useRefocusOnDeletion.test/listItem', listItem);
			rerender({ noteCount: 3, folderId: 'folder-2' });
			rerender({ noteCount: 2, folderId: 'folder-2' });
			expect(focusNote).not.toHaveBeenCalled();
		} finally {
			cleanup();
		}
	});
});
