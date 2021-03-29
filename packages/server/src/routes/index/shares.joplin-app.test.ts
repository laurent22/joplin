// import { FolderEntity, NoteEntity } from '@joplin/lib/services/database/types';
// import { Share, ShareType } from '../../db';
// import routeHandler from '../../middleware/routeHandler';
// import { postApi } from '../../utils/testing/apiUtils';
// import { putFileContent, testFilePath, postDirectory } from '../../utils/testing/fileApiUtils';
// import { postShare } from '../../utils/testing/shareApiUtils';
// import { beforeAllDb, afterAllTests, parseHtml, beforeEachDb, createUserAndSession, createFile, koaAppContext, checkContextError, expectNotThrow } from '../../utils/testing/testUtils';

// const defaultFolderId:string = 'e98f305dde8b47b793f031cf883324ff';

// function makeNoteSerializedBody(note: NoteEntity = {}): string {
// 	return `${'title' in note ? note.title : 'Title'}

// ${'body' in note ? note.body : 'Body'}

// id: ${'id' in note ? note.id : 'b39dadd7a63742bebf3125fd2a9286d4'}
// parent_id: ${defaultFolderId}
// created_time: 2020-10-15T10:34:16.044Z
// updated_time: 2021-01-28T23:10:30.054Z
// is_conflict: 0
// latitude: 0.00000000
// longitude: 0.00000000
// altitude: 0.0000
// author:
// source_url:
// is_todo: 1
// todo_due: 1602760405000
// todo_completed: 0
// source: joplindev-desktop
// source_application: net.cozic.joplindev-desktop
// application_data:
// order: 0
// user_created_time: 2020-10-15T10:34:16.044Z
// user_updated_time: 2020-10-19T17:21:03.394Z
// encryption_cipher_text:
// encryption_applied: 0
// markup_language: 1
// is_shared: 1
// type_: 1`;
// }

// function makeFolderSerializedBody(folder:FolderEntity = {}):string {
// 	return `${'title' in folder ? folder.title : 'Title'}

// id: ${defaultFolderId}
// created_time: 2020-11-11T18:44:14.534Z
// updated_time: 2020-11-11T18:44:14.534Z
// user_created_time: 2020-11-11T18:44:14.534Z
// user_updated_time: 2020-11-11T18:44:14.534Z
// encryption_cipher_text:
// encryption_applied: 0
// parent_id:
// is_shared: 0
// type_: 2`;
// }

// // const resourceSize = 2720;

// // const resourceContents: Record<string, string> = {
// // 	image: `Test Image

// // id: 96765a68655f4446b3dbad7d41b6566e
// // mime: image/jpeg
// // filename:
// // created_time: 2020-10-15T10:37:58.090Z
// // updated_time: 2020-10-15T10:37:58.090Z
// // user_created_time: 2020-10-15T10:37:58.090Z
// // user_updated_time: 2020-10-15T10:37:58.090Z
// // file_extension: jpg
// // encryption_cipher_text:
// // encryption_applied: 0
// // encryption_blob_encrypted: 0
// // size: ${resourceSize}
// // is_shared: 0
// // type_: 4`,

// // };

// // async function getShareContent(shareId: string, query: any = {}): Promise<string | Buffer> {
// // 	const context = await koaAppContext({
// // 		request: {
// // 			method: 'GET',
// // 			url: `/shares/${shareId}`,
// // 			query,
// // 		},
// // 	});
// // 	await routeHandler(context);
// // 	await checkContextError(context);
// // 	return context.response.body;
// // }

// describe('shares.joplin-app', function() {

// 	beforeAll(async () => {
// 		await beforeAllDb('shares.joplin-app');
// 	});

// 	afterAll(async () => {
// 		await afterAllTests();
// 	});

// 	beforeEach(async () => {
// 		await beforeEachDb();
// 	});

// 	test('should share a folder', async function() {
// 		const { user, session } = await createUserAndSession();

// 		const noteId1 = '00000000000000000000000000000001';
// 		const noteId2 = '00000000000000000000000000000002';

// 		await createFile(user.id, 'root:/' + defaultFolderId + '.md:', makeFolderSerializedBody());
// 		await createFile(user.id, 'root:/' + noteId1 + '.md:', makeNoteSerializedBody({ id: noteId1 }));
// 		await createFile(user.id, 'root:/' + noteId2 + '.md:', makeNoteSerializedBody({ id: noteId2 }));

// 		const share = await postApi<Share>(session.id, `shares`, {
// 			type: ShareType.JoplinApp,
// 			folder_id: defaultFolderId,
// 		});
// 	});

// });
