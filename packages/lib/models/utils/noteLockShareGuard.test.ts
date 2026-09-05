import Setting from '../Setting';
import Note from '../Note';
import Folder from '../Folder';
import BaseItem from '../BaseItem';
import ItemChange from '../ItemChange';
import { setupDatabaseAndSynchronizer, switchClient, afterAllCleanUp } from '../../testing/test-utils';
import { defaultState as defaultShareState, ShareType } from '../../services/share/reducer';
import onFolderDrop from './onFolderDrop';

type ShareFields = { type: ShareType; folder_id?: string; note_id?: string };

const setShareCache = (shares: ShareFields[]) => {
	BaseItem.syncShareCache = {
		...defaultShareState,
		shares: shares.map((share, index) => ({ id: `share-${index + 1}`, folder_id: '', note_id: '', master_key_id: '', ...share })),
	};
};

// evidence is either the folder's own persisted marker or the active share cache, since each can
// exist without the other while a share is being created or synced.
const makeSharedFolder = async (evidence: string) => {
	const folder = await Folder.save({ title: 'shared', ...(evidence === 'marker' ? { share_id: 'share-1' } : {}) });
	if (evidence === 'cache') setShareCache([{ type: ShareType.Folder, folder_id: folder.id }]);
	return folder;
};

describe('noteLockShareGuard', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		Setting.setValue('featureFlag.noteLock', true);
		BaseItem.syncShareCache = defaultShareState;
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	test.each([
		['a persisted folder marker', 'marker'],
		['the active share cache', 'cache'],
	])('should refuse locking a note in a shared notebook known through %s', async (_label, evidence) => {
		const folder = await makeSharedFolder(evidence);
		const note = await Note.save({ title: 'note', parent_id: folder.id });

		await expect(Note.save({ id: note.id, is_locked: 1 })).rejects.toThrow('cannot be locked');
		expect((await Note.load(note.id)).is_locked).toBe(0);
	});

	it('should refuse locking a published note', async () => {
		const marked = await Note.save({ title: 'marked', is_shared: 1 });
		await expect(Note.save({ id: marked.id, is_locked: 1 })).rejects.toThrow('cannot be locked');

		const cached = await Note.save({ title: 'cached' });
		setShareCache([{ type: ShareType.Note, note_id: cached.id }]);
		await expect(Note.save({ id: cached.id, is_locked: 1 })).rejects.toThrow('cannot be locked');
	});

	test.each([
		['a persisted folder marker', 'marker'],
		['the active share cache', 'cache'],
	])('should refuse moving a locked note into a shared notebook known through %s', async (_label, evidence) => {
		const destination = await makeSharedFolder(evidence);
		const source = await Folder.save({ title: 'private' });
		const note = await Note.save({ title: 'note', parent_id: source.id, is_locked: 1 });

		await expect(Note.save({ id: note.id, parent_id: destination.id })).rejects.toThrow('cannot be moved');
		expect((await Note.load(note.id)).parent_id).toBe(source.id);
	});

	it('should refuse creating a locked note in a shared notebook but allow a conflict copy', async () => {
		const folder = await makeSharedFolder('marker');

		await expect(Note.save({ title: 'note', is_locked: 1, parent_id: folder.id })).rejects.toThrow('cannot be locked');
		await expect(Note.save({ title: 'conflict', is_locked: 1, is_conflict: 1, parent_id: folder.id })).resolves.toBeTruthy();
	});

	it('should refuse moving a notebook that contains a locked note into a shared notebook', async () => {
		const destination = await makeSharedFolder('marker');
		const source = await Folder.save({ title: 'source' });
		await Note.save({ title: 'locked', parent_id: source.id, is_locked: 1 });

		await expect(Folder.save({ id: source.id, parent_id: destination.id })).rejects.toThrow('cannot be moved');
		expect((await Folder.load(source.id)).parent_id).toBe('');

		const clean = await Folder.save({ title: 'clean' });
		await expect(Folder.save({ id: clean.id, parent_id: destination.id })).resolves.toBeTruthy();
	});

	it('should allow moving a locked note between private notebooks', async () => {
		const source = await Folder.save({ title: 'source' });
		const destination = await Folder.save({ title: 'destination' });
		const note = await Note.save({ title: 'note', parent_id: source.id, is_locked: 1 });

		await expect(Note.save({ id: note.id, parent_id: destination.id })).resolves.toBeTruthy();
		expect((await Note.load(note.id)).parent_id).toBe(destination.id);
	});

	it('should still allow editing and unlocking a locked note that ended up shared', async () => {
		const note = await Note.save({ title: 'note', is_locked: 1 });
		await Note.save({ id: note.id, share_id: 'share-1' });

		await expect(Note.save({ id: note.id, title: 'renamed' })).resolves.toBeTruthy();
		await expect(Note.save({ id: note.id, is_locked: 0 })).resolves.toBeTruthy();
	});

	it('should not apply to sync-sourced saves', async () => {
		const folder = await makeSharedFolder('marker');
		const note = await Note.save({ title: 'note', parent_id: folder.id });

		await expect(Note.save({ id: note.id, is_locked: 1 }, { changeSource: ItemChange.SOURCE_SYNC })).resolves.toBeTruthy();
	});

	it('should not fire on share id propagation saves', async () => {
		const folder = await Folder.save({ title: 'folder' });
		const note = await Note.save({ title: 'note', parent_id: folder.id, is_locked: 1 });
		await Folder.save({ id: folder.id, share_id: 'share-1' });

		// The exact save shape used by Folder.updateNoteShareIds() at the start of every sync.
		await expect(Note.save({
			id: note.id, share_id: 'share-1', parent_id: folder.id, updated_time: Date.now(),
		}, { autoTimestamp: false, disableReadOnlyCheck: true })).resolves.toBeTruthy();
	});

	it('should refuse a batch trash move of a locked note into a deleted folder under a share', async () => {
		const root = await makeSharedFolder('marker');
		const sub = await Folder.save({ title: 'sub', parent_id: root.id });
		await Folder.delete(sub.id, { toTrash: true });
		const note = await Note.save({ title: 'note', is_locked: 1 });

		// Desktop drag-and-drop onto a deleted folder re-parents through batch SQL, not BaseItem.save.
		await expect(onFolderDrop([note.id], [], sub.id)).rejects.toThrow('cannot be moved');
		expect((await Note.load(note.id)).parent_id).toBe('');
		expect((await Note.load(note.id)).deleted_time).toBe(0);

		await expect(Note.delete(note.id, { toTrash: true })).resolves.toBeUndefined();
		expect((await Note.load(note.id)).deleted_time).toBeGreaterThan(0);
	});

	it('should refuse a folder drop onto a deleted folder under a share before trashing its children', async () => {
		const root = await makeSharedFolder('marker');
		const target = await Folder.save({ title: 'target', parent_id: root.id });
		await Folder.delete(target.id, { toTrash: true });
		const source = await Folder.save({ title: 'source' });
		const note = await Note.save({ title: 'locked', parent_id: source.id, is_locked: 1 });

		await expect(onFolderDrop([], [source.id], target.id)).rejects.toThrow('cannot be moved');
		// A late rejection would leave the folder live but its children already in the trash.
		expect((await Folder.load(source.id)).deleted_time).toBe(0);
		expect((await Note.load(note.id)).deleted_time).toBe(0);
		expect((await Note.load(note.id)).parent_id).toBe(source.id);
	});

	it('should refuse turning a locked conflict into a normal note under a shared notebook', async () => {
		const folder = await makeSharedFolder('marker');
		const conflict = await Note.save({ title: 'conflict', is_locked: 1, is_conflict: 1, parent_id: folder.id });

		await expect(Note.moveToFolder(conflict.id, folder.id)).rejects.toThrow('cannot be moved');
		expect((await Note.load(conflict.id)).is_conflict).toBe(1);

		const privateFolder = await Folder.save({ title: 'private' });
		await expect(Note.moveToFolder(conflict.id, privateFolder.id)).resolves.toBeTruthy();
		expect((await Note.load(conflict.id)).is_conflict).toBe(0);
	});

	// Resolving a conflict in place is the common recovery gesture, so it must not regress.
	it('should allow resolving a locked conflict onto its own private parent', async () => {
		const folder = await Folder.save({ title: 'private' });
		const conflict = await Note.save({ title: 'conflict', is_locked: 1, is_conflict: 1, parent_id: folder.id });

		await expect(Note.moveToFolder(conflict.id, folder.id)).resolves.toBeTruthy();
		expect((await Note.load(conflict.id)).is_conflict).toBe(0);
	});

	it('should do nothing when note lock is disabled', async () => {
		Setting.setValue('featureFlag.noteLock', false);
		const folder = await Folder.save({ title: 'shared', share_id: 'share-1' });
		const note = await Note.save({ title: 'note', parent_id: folder.id });

		await expect(Note.save({ id: note.id, is_locked: 1 })).resolves.toBeTruthy();
	});

});
