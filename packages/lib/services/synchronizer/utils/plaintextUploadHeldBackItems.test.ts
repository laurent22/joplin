import BaseItem from '../../../models/BaseItem';
import Folder from '../../../models/Folder';
import Note from '../../../models/Note';
import Resource from '../../../models/Resource';
import shim from '../../../shim';
import { ErrorCode } from '../../../errors';
import { resourceService, setupDatabaseAndSynchronizer, supportDir, switchClient, syncTargetId } from '../../../testing/test-utils';
import { ShareType, StateShare } from '../../share/reducer';
import { setEncryptionEnabled } from '../syncInfoUtils';
import { heldBackItemsToConfirm, heldBackItemToLine, loadPlaintextUploadHeldBackItemGroups, PlaintextUploadReason } from './plaintextUploadHeldBackItems';
import { join } from 'path';
import { NoteEntity } from '../../database/types';

const holdBack = async (item: { id?: string; type_?: number }) => {
	await BaseItem.saveSyncDisabled(syncTargetId(), item, ErrorCode.PlaintextUploadNotConfirmed);
};

const folderShare = (id: string, folderId: string, masterKeyId: string): StateShare => {
	return { id, type: ShareType.Folder, folder_id: folderId, note_id: '', master_key_id: masterKeyId };
};

const noteShare = (id: string, noteId: string, masterKeyId: string): StateShare => {
	return { id, type: ShareType.Note, folder_id: '', note_id: noteId, master_key_id: masterKeyId };
};

const withAttachedFile = async (note: NoteEntity) => {
	await shim.attachFileToNote(note, join(supportDir, 'photo.jpg'));
	return await Note.load(note.id);
};

describe('plaintextUploadHeldBackItems', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	test('should group held-back items by reason, and only offer to confirm those that still need it', async () => {
		setEncryptionEnabled(true);
		const shareRoot = await Folder.save({ title: 'Shared "root"\nline 2', share_id: 'unencrypted' });
		const items = [
			await Note.save({ title: 'b published', is_shared: 1 }),
			await Folder.save({ title: 'a published folder', is_shared: 1 }),
			await Note.save({ title: 'shared', parent_id: shareRoot.id, share_id: 'unencrypted' }),
			await Note.save({ title: 'unknown share', share_id: 'missing' }),
			await Note.save({ title: 'encrypted share', share_id: 'encrypted' }),
			await Note.save({ title: '' }),
		];
		for (const item of items) await holdBack(item);
		await holdBack(shareRoot);

		const shares = [folderShare('unencrypted', shareRoot.id, ''), folderShare('encrypted', shareRoot.id, 'some-key')];
		const groups = await loadPlaintextUploadHeldBackItemGroups(syncTargetId(), shares);

		expect(groups.map(g => [g.reason, g.label, g.items.map(i => i.title)])).toEqual([
			[PlaintextUploadReason.Published, 'Published note', ['b published']],
			[PlaintextUploadReason.Published, 'In published notebook "a published folder"', ['a published folder']],
			[PlaintextUploadReason.UnencryptedShare, 'In notebook "Shared \'root\' line 2", shared without encryption', ['Shared "root"\nline 2', 'shared']],
			[PlaintextUploadReason.UnknownShare, 'In a shared notebook', ['unknown share']],
			[PlaintextUploadReason.None, expect.any(String), ['', 'encrypted share']],
		]);
		expect(groups[1].items.map(i => i.typeLabel)).toEqual(['Notebook']);

		// An untitled item is shown without quotes, so that it can't be mistaken for a title
		expect(heldBackItemToLine(groups[4].items[0])).toBe(`Note: Untitled (${items[5].id})`);

		expect(heldBackItemsToConfirm(groups).map(item => item.id).sort()).toEqual([items[0].id, items[1].id, items[2].id, items[3].id, shareRoot.id].sort());
	});

	test('should group held-back attachments by associated notes', async () => {
		setEncryptionEnabled(true);
		const n1 = await withAttachedFile(await Note.save({ title: 'published note', parent_id: '', is_shared: 1 }));
		const sharedFolder = await Folder.save({ title: 'shared', share_id: 'unencrypted' });
		const n2 = await withAttachedFile(await Note.save({ title: 'shared note', parent_id: sharedFolder.id, share_id: 'unencrypted' }));

		const items = [
			n1, n2, sharedFolder, ...await Resource.all(),
		];
		for (const item of items) {
			await holdBack(item);
		}

		await resourceService().indexNoteResources();
		await Folder.updateAllShareIds(resourceService(), []);

		const shares = [folderShare('unencrypted', sharedFolder.id, ''), noteShare('s1', n1.id, ''), noteShare('s2', n2.id, '')];
		const groups = await loadPlaintextUploadHeldBackItemGroups(syncTargetId(), shares);

		const n1ResourceIds = await Note.linkedResourceIds(n1.body);
		const n2ResourceIds = await Note.linkedResourceIds(n2.body);
		expect(groups.map(g => [g.reason, g.label, g.items.map(i => i.id)])).toEqual([
			[PlaintextUploadReason.Published, 'Published note', [n1.id]],
			[PlaintextUploadReason.Published, 'Attachment of a published note', n1ResourceIds],
			[PlaintextUploadReason.UnencryptedShare, 'In notebook "shared", shared without encryption', [sharedFolder.id, n2.id, ...n2ResourceIds]],
		]);
	});

	test('should not offer to confirm any items when E2EE is disabled', async () => {
		setEncryptionEnabled(false);
		await holdBack(await Note.save({ title: 'published', is_shared: 1 }));

		const groups = await loadPlaintextUploadHeldBackItemGroups(syncTargetId(), []);
		expect(groups.map(g => g.reason)).toEqual([PlaintextUploadReason.None]);
		expect(heldBackItemsToConfirm(groups)).toEqual([]);
	});

});
