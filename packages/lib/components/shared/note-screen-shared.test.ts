import Note from '../../models/Note';
import Folder from '../../models/Folder';
import { setupDatabaseAndSynchronizer, switchClient, createNTestFolders } from '../../testing/test-utils';
import shared, { BaseNoteScreenComponent, BaseState } from './note-screen-shared';
import { NoteEntity } from '../../services/database/types';

// Builds a minimal fake note screen component whose setState() behaves like
// React's shallow-merge setState, so tests can inspect comp.state afterwards.
function makeComp(initialState: BaseState): BaseNoteScreenComponent {
	const comp: BaseNoteScreenComponent = {
		props: { provisionalNoteIds: [], noteId: initialState.note.id, folders: [], sharedData: undefined, noteVisiblePanes: [] },
		state: initialState,
		setState: (partial: Partial<BaseState>) => {
			comp.state = { ...comp.state, ...partial };
		},
		scheduleSave: jest.fn(),
		scheduleFocusUpdate: jest.fn(),
		attachFile: jest.fn(),
	};
	return comp;
}

function baseState(note: NoteEntity, folder: Folder): BaseState {
	return {
		note,
		lastSavedNote: { ...note },
		newAndNoTitleChangeNoteId: false,
		mode: 'edit',
		folder: folder as unknown as BaseState['folder'],
		isLoading: false,
		fromShare: false,
		noteResources: {},
		readOnly: false,
		noteLastLoadTime: Date.now(),
	};
}

describe('components/shared/note-screen-shared', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	// b0 and b1 are coupled: noteComponent_change must hand scheduleSave a
	// *complete* state snapshot (b1), and saveNoteButton_press must let the
	// live comp.state win over that (possibly stale) snapshot when it merges
	// (b0). Fixing only one still lets a change get dropped, so both must be
	// exercised together, matching how a real scheduled save fires against a
	// snapshot captured earlier: user types -> a save is scheduled with a
	// snapshot -> user immediately toggles a checkbox -> the scheduled save
	// finally runs against the now-stale snapshot.
	it('does not drop a checkbox toggle made after typing, when the earlier scheduled save finally runs', async () => {
		const [folder] = await createNTestFolders(1);
		const savedNote = await Note.save({ title: 'note', parent_id: folder.id, body: 'hello', is_todo: 1, todo_completed: 0 });

		const comp = makeComp(baseState(savedNote, folder));

		// User types more text: this schedules a save and captures a snapshot
		// of comp.state at this point in time.
		shared.noteComponent_change(comp, 'body', 'hello world');
		expect(comp.scheduleSave).toHaveBeenCalledTimes(1);
		const scheduledSnapshot = (comp.scheduleSave as jest.Mock).mock.calls[0][0] as BaseState;

		// The snapshot handed to scheduleSave must be a complete BaseState,
		// not just the changed 'note' field (b1).
		expect(scheduledSnapshot.lastSavedNote).toEqual(comp.state.lastSavedNote);
		expect(scheduledSnapshot.mode).toBe(comp.state.mode);

		// User immediately checks the to-do box: another change goes through
		// the same code path, updating comp.state and scheduling its own
		// (still-pending) save.
		shared.noteComponent_change(comp, 'todo_completed', 123456);
		expect(comp.state.note.body).toBe('hello world');
		expect(comp.state.note.todo_completed).toBe(123456);

		// The earlier scheduled save now runs, using the snapshot captured
		// before the checkbox toggle. It must not clobber the newer
		// comp.state with the stale snapshot (b0).
		await shared.saveNoteButton_press(comp, scheduledSnapshot, null, null);

		const reloaded = await Note.load(savedNote.id);
		expect(reloaded.body).toBe('hello world');
		expect(reloaded.todo_completed).toBe(123456);
	});
});
