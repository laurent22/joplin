import { afterAllTests, beforeAllDb, beforeEachDb } from '../../utils/testing/testUtils';

// What resources should be shared is now handled on the client so these tests
// probably aren't necessary anymore.

describe('shares.resource', () => {

	beforeAll(async () => {
		await beforeAllDb('shares.resource');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should pass', async () => {
		expect(true).toBe(true);
	});

	// test('should share both resource and blob', async function() {
	// 	const { user: user1, session: session1 } = await createUserAndSession(1);
	// 	const { user: user2, session: session2 } = await createUserAndSession(2);

	// 	const resourceItem1 = await createResource(session1.id, { id: '000000000000000000000000000000E1' }, 'testing1');

	// 	const { share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', [
	// 		{
	// 			id: '000000000000000000000000000000F1',
	// 			children: [
	// 				{
	// 					id: '00000000000000000000000000000001',
	// 					title: 'note test',
	// 					body: `[testing](:/${resourceItem1.jop_id})`,
	// 				},
	// 			],
	// 		},
	// 	]);

	// 	await models().item().saveForUser(user1.id, { id: resourceItem1.id, jop_share_id: share.id });

	// 	await models().share().updateSharedItems3();

	// 	expect((await models().userItem().byUserId(user2.id)).length).toBe(4);
	// });

});

// import { ShareType } from '../../services/database/types';
// import { beforeAllDb, afterAllTests, beforeEachDb, createUserAndSession, models, createResource, createItemTree2, updateNote, createNote } from '../../utils/testing/testUtils';
// import { getApi } from '../../utils/testing/apiUtils';
// import { shareWithUserAndAccept } from '../../utils/testing/shareApiUtils';
// import { PaginatedItems } from '../../models/ItemModel';

// describe('shares.resource', function() {

// 	beforeAll(async () => {
// 		await beforeAllDb('shares.resource');
// 	});

// 	afterAll(async () => {
// 		await afterAllTests();
// 	});

// 	beforeEach(async () => {
// 		await beforeEachDb();
// 	});

// 	test('should share resources inside a shared folder', async function() {
// 		const { user: user1, session: session1 } = await createUserAndSession(1);
// 		const { user: user2, session: session2 } = await createUserAndSession(2);

// 		const resourceItem1 = await createResource(session1.id, { id: '000000000000000000000000000000E1' }, 'testing1');
// 		const resourceItem2 = await createResource(session1.id, { id: '000000000000000000000000000000E2' }, 'testing2');

// 		await createItemTree2(user1.id, '', [
// 			{
// 				id: '000000000000000000000000000000F1',
// 				children: [
// 					{
// 						id: '00000000000000000000000000000001',
// 						title: 'note test',
// 						body: `[testing](:/${resourceItem1.jop_id}) [testing](:/${resourceItem2.jop_id})`,
// 					},
// 				],
// 			},
// 		]);

// 		const folderItem = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');

// 		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

// 		const children = await getApi<PaginatedItems>(session2.id, 'items/root/children');

// 		expect(children.items.length).toBe(6);
// 		expect(!!children.items.find(i => i.name === '000000000000000000000000000000E1.md')).toBe(true);
// 		expect(!!children.items.find(i => i.name === '.resource/000000000000000000000000000000E1')).toBe(true);
// 		expect(!!children.items.find(i => i.name === '000000000000000000000000000000E2.md')).toBe(true);
// 		expect(!!children.items.find(i => i.name === '.resource/000000000000000000000000000000E2')).toBe(true);
// 	});

// 	test('should update resources share status', async function() {
// 		const { user: user1, session: session1 } = await createUserAndSession(1);
// 		const { user: user2, session: session2 } = await createUserAndSession(2);

// 		const resourceItem1 = await createResource(session1.id, { id: '000000000000000000000000000000E1' }, 'testing1');
// 		const resourceItem2 = await createResource(session1.id, { id: '000000000000000000000000000000E2' }, 'testing2');

// 		await createItemTree2(user1.id, '', [
// 			{
// 				id: '000000000000000000000000000000F1',
// 				children: [
// 					{
// 						id: '00000000000000000000000000000001',
// 						title: 'note test',
// 						body: `[testing](:/${resourceItem1.jop_id}) [testing](:/${resourceItem2.jop_id})`,
// 					},
// 				],
// 			},
// 			{
// 				id: '000000000000000000000000000000F2',
// 				children: [],
// 			},
// 		]);

// 		const folderItem = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
// 		const noteItem = await models().item().loadByJopId(user1.id, '00000000000000000000000000000001');

// 		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

// 		// Note is moved to another folder, outside of shared folder

// 		{
// 			const note = await models().item().loadAsJoplinItem(noteItem.id);
// 			await updateNote(session1.id, { ...note, parent_id: '000000000000000000000000000000F2' });
// 			await models().share().updateSharedItems2(user2.id);
// 			const newChildren = await models().item().children(user2.id);
// 			expect(newChildren.items.length).toBe(1);
// 			expect(!!newChildren.items.find(i => i.name === '000000000000000000000000000000F1.md')).toBe(true);
// 		}

// 		// Note is moved back to a shared folder

// 		{
// 			const note = await models().item().loadAsJoplinItem(noteItem.id);
// 			await updateNote(session1.id, { ...note, parent_id: '000000000000000000000000000000F1' });
// 			await models().share().updateSharedItems2(user2.id);
// 			const newChildren = await models().item().children(user2.id);
// 			expect(newChildren.items.length).toBe(6);
// 		}

// 		// One resource is removed from the note

// 		{
// 			const note = await models().item().loadAsJoplinItem(noteItem.id);
// 			await updateNote(session1.id, { ...note, body: `[testing](:/${resourceItem1.jop_id})` });
// 			await models().share().updateSharedItems2(user2.id);
// 			const children = await models().item().children(user2.id);
// 			expect(children.items.length).toBe(4);
// 			expect(!!children.items.find(i => i.name === '000000000000000000000000000000E1.md')).toBe(true);
// 			expect(!!children.items.find(i => i.name === '.resource/000000000000000000000000000000E1')).toBe(true);
// 			expect(!!children.items.find(i => i.name === '000000000000000000000000000000E2.md')).toBe(false);
// 			expect(!!children.items.find(i => i.name === '.resource/000000000000000000000000000000E2')).toBe(false);
// 		}

// 		// One resource is added to the note

// 		{
// 			const note = await models().item().loadAsJoplinItem(noteItem.id);
// 			await updateNote(session1.id, { ...note, body: `[testing](:/${resourceItem1.jop_id}) [testing](:/${resourceItem2.jop_id})` });
// 			await models().share().updateSharedItems2(user2.id);
// 			const children = await models().item().children(user2.id);
// 			expect(children.items.length).toBe(6);
// 			expect(!!children.items.find(i => i.name === '000000000000000000000000000000E1.md')).toBe(true);
// 			expect(!!children.items.find(i => i.name === '.resource/000000000000000000000000000000E1')).toBe(true);
// 			expect(!!children.items.find(i => i.name === '000000000000000000000000000000E2.md')).toBe(true);
// 			expect(!!children.items.find(i => i.name === '.resource/000000000000000000000000000000E2')).toBe(true);
// 		}
// 	});

// 	test('should update resources share status - user 1 adds resource to note, user 2 moves note out of shared folder', async function() {
// 		const { user: user1, session: session1 } = await createUserAndSession(1);
// 		const { user: user2, session: session2 } = await createUserAndSession(2);

// 		const resourceItem1 = await createResource(session1.id, { id: '000000000000000000000000000000E1' }, 'testing1');

// 		await createItemTree2(user1.id, '', [
// 			{
// 				id: '000000000000000000000000000000F1',
// 				children: [
// 					{
// 						id: '00000000000000000000000000000001',
// 						title: 'note test',
// 						body: `[testing](:/${resourceItem1.jop_id})`,
// 					},
// 				],
// 			},
// 		]);

// 		await createItemTree2(user2.id, '', [
// 			{
// 				id: '000000000000000000000000000000F2',
// 				children: [],
// 			},
// 		]);

// 		const folderItem = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
// 		const noteItem = await models().item().loadByJopId(user1.id, '00000000000000000000000000000001');

// 		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

// 		// Note is moved by user 2 to another folder

// 		{
// 			const note = await models().item().loadAsJoplinItem(noteItem.id);
// 			await updateNote(session2.id, { ...note, parent_id: '000000000000000000000000000000F2' });
// 			await models().share().updateSharedItems2(user1.id);

// 			const children1 = await models().item().children(user1.id);
// 			expect(children1.items.length).toBe(1);
// 			expect(children1.items[0].name).toBe('000000000000000000000000000000F1.md');

// 			const children2 = await models().item().children(user2.id);
// 			expect(children2.items.length).toBe(5);
// 			expect(children2.items.find(c => c.name === '000000000000000000000000000000E1.md')).toBeTruthy();
// 			expect(children2.items.find(c => c.name === '.resource/000000000000000000000000000000E1')).toBeTruthy();
// 		}
// 	});

// 	test('should update resources share status - user 2 adds a note and a resource', async function() {
// 		const { user: user1, session: session1 } = await createUserAndSession(1);
// 		const { user: user2, session: session2 } = await createUserAndSession(2);

// 		await createItemTree2(user1.id, '', [
// 			{
// 				id: '000000000000000000000000000000F1',
// 				children: [],
// 			},
// 		]);

// 		const folderItem = await models().item().loadByJopId(user1.id, '000000000000000000000000000000F1');
// 		await shareWithUserAndAccept(session1.id, session2.id, user2, ShareType.JoplinRootFolder, folderItem);

// 		// User 2 adds a note and a resource

// 		{
// 			const resourceItem1 = await createResource(session2.id, { id: '000000000000000000000000000000E1' }, 'testing1');
// 			await createNote(session2.id, { id: '00000000000000000000000000000001', parent_id: '000000000000000000000000000000F1', body: `[testing](:/${resourceItem1.jop_id})` });
// 			await models().share().updateSharedItems2(user1.id);

// 			const children1 = await models().item().children(user1.id);
// 			expect(children1.items.length).toBe(4);
// 			expect(children1.items.find(c => c.name === '00000000000000000000000000000001.md')).toBeTruthy();
// 			expect(children1.items.find(c => c.name === '000000000000000000000000000000E1.md')).toBeTruthy();
// 			expect(children1.items.find(c => c.name === '.resource/000000000000000000000000000000E1')).toBeTruthy();
// 		}
// 	});

// });
