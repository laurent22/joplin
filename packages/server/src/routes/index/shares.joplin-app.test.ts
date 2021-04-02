import { FolderEntity, NoteEntity } from '@joplin/lib/services/database/types';
import { Share, ShareType, ShareUser } from '../../db';
import { PaginatedFiles } from '../../models/FileModel';
import { getApi, patchApi, postApi } from '../../utils/testing/apiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, createFile2 } from '../../utils/testing/testUtils';

const defaultFolderId: string = 'e98f305dde8b47b793f031cf883324ff';

function makeNoteSerializedBody(note: NoteEntity = {}): string {
	return `${'title' in note ? note.title : 'Title'}

${'body' in note ? note.body : 'Body'}

id: ${'id' in note ? note.id : 'b39dadd7a63742bebf3125fd2a9286d4'}
parent_id: ${'parent_id' in note ? note.parent_id : defaultFolderId}
created_time: 2020-10-15T10:34:16.044Z
updated_time: 2021-01-28T23:10:30.054Z
is_conflict: 0
latitude: 0.00000000
longitude: 0.00000000
altitude: 0.0000
author:
source_url:
is_todo: 1
todo_due: 1602760405000
todo_completed: 0
source: joplindev-desktop
source_application: net.cozic.joplindev-desktop
application_data:
order: 0
user_created_time: 2020-10-15T10:34:16.044Z
user_updated_time: 2020-10-19T17:21:03.394Z
encryption_cipher_text:
encryption_applied: 0
markup_language: 1
is_shared: 1
type_: 1`;
}

function makeFolderSerializedBody(folder: FolderEntity = {}): string {
	return `${'title' in folder ? folder.title : 'Title'}

id: ${defaultFolderId}
created_time: 2020-11-11T18:44:14.534Z
updated_time: 2020-11-11T18:44:14.534Z
user_created_time: 2020-11-11T18:44:14.534Z
user_updated_time: 2020-11-11T18:44:14.534Z
encryption_cipher_text:
encryption_applied: 0
parent_id:
is_shared: 0
type_: 2`;
}
async function shareFolder(sharerSessionId: string, shareeSessionId: string, shareeEmail: string, folderFilePath: string): Promise<Share> {
	const share = await postApi<Share>(sharerSessionId, 'shares', {
		type: ShareType.JoplinApp,
		file_id: folderFilePath,
	});

	const shareUser = await postApi(sharerSessionId, `shares/${share.id}/users`, {
		email: shareeEmail,
	}) as ShareUser;

	await patchApi<ShareUser>(shareeSessionId, `share_users/${shareUser.id}`, { is_accepted: 1 });

	return share;

}

describe('shares.joplin-app', function() {

	beforeAll(async () => {
		await beforeAllDb('shares.joplin-app');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should share a folder', async function() {
		const { session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const folderId = '000000000000000000000000000000F1';

		await createFile2(session1.id, `root:/${folderId}.md:`, makeFolderSerializedBody());

		await shareFolder(session1.id, session2.id, user2.email, `root:/${folderId}.md:`);

		const results = await getApi<PaginatedFiles>(session2.id, 'files/root/children');
		expect(results.items.length).toBe(1);
		expect(!!results.items.find(o => o.name === `${folderId}.md`)).toBe(true);
	});

	test('should share notes added to a shared folder', async function() {
		const { session: session1 } = await createUserAndSession(1);
		const { user: user2, session: session2 } = await createUserAndSession(2);

		const folderId = '000000000000000000000000000000F1';
		const noteId1 = '00000000000000000000000000000001';
		const noteId2 = '00000000000000000000000000000002';

		await createFile2(session1.id, `root:/${folderId}.md:`, makeFolderSerializedBody());

		await shareFolder(session1.id, session2.id, user2.email, `root:/${folderId}.md:`);

		await createFile2(session1.id, `root:/${noteId1}.md:`, makeNoteSerializedBody({ id: noteId1, parent_id: folderId }));
		await createFile2(session1.id, `root:/${noteId2}.md:`, makeNoteSerializedBody({ id: noteId2, parent_id: folderId }));

		const results = await getApi<PaginatedFiles>(session2.id, 'files/root/children');
		console.info(results);
	});

});
