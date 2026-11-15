import AsyncActionQueue from '@joplin/lib/AsyncActionQueue';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { renderHook } from '@testing-library/react';
import { createRef } from 'react';
import { defaultFormNote, FormNote, NoteBodyEditorRef } from './types';
import useScheduleSaveCallbacks from './useScheduleSaveCallbacks';

describe('useScheduleSaveCallbacks', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test('should keep the notebook a note was moved to while the editor had unsaved changes', async () => {
		const folderA = await Folder.save({ title: 'Notebook A' });
		const folderB = await Folder.save({ title: 'Notebook B' });
		const note = await Note.save({ title: 'Shopping list', body: 'Milk', parent_id: folderA.id });
		const formNote: FormNote = {
			...defaultFormNote(),
			id: note.id,
			parent_id: folderA.id,
			title: note.title,
			body: 'Milk and eggs',
			is_conflict: 0,
			saveActionQueue: new AsyncActionQueue(0),
		};

		// The move made on another device is synced before the editor saves the typed text.
		await Note.save({ id: note.id, parent_id: folderB.id });

		const { result } = renderHook(() => useScheduleSaveCallbacks({
			setFormNote: { current: () => {} },
			formNote: { current: formNote },
			editorId: 'test-editor',
			dispatch: jest.fn(),
			editorRef: createRef<NoteBodyEditorRef>(),
			editorNoteReloadTimeRequest: 0,
		}));
		await result.current.scheduleSaveNote(formNote);

		const savedNote = await Note.load(note.id);
		expect(savedNote.parent_id).toBe(folderB.id);
		expect(savedNote.body).toBe('Milk and eggs');
	});
});
