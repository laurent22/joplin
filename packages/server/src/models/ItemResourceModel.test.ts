import { beforeAllDb, afterAllTests, beforeEachDb, models, createUserAndSession, createNote, createResource } from '../utils/testing/testUtils';

describe('ItemResourceModel', () => {

	beforeAll(async () => {
		await beforeAllDb('ItemResourceModel');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should get an item tree', async () => {
		const { session } = await createUserAndSession();

		const linkedNote1 = await createNote(session.id, {
			id: '000000000000000000000000000000C1',
		});

		const resource = await createResource(session.id, {
			id: '000000000000000000000000000000E1',
		}, 'test');

		const linkedNote2 = await createNote(session.id, {
			id: '000000000000000000000000000000C2',
			body: `![](:/${resource.jop_id})`,
		});

		const rootNote = await createNote(session.id, {
			id: '00000000000000000000000000000001',
			body: `[](:/${linkedNote1.jop_id}) [](:/${linkedNote2.jop_id})`,
		});

		const tree = await models().itemResource().itemTree(rootNote.id, rootNote.jop_id);

		expect(tree).toEqual({
			item_id: rootNote.id,
			resource_id: '00000000000000000000000000000001',
			children: [
				{
					item_id: linkedNote1.id,
					resource_id: '000000000000000000000000000000C1',
					children: [],
				},
				{
					item_id: linkedNote2.id,
					resource_id: '000000000000000000000000000000C2',
					children: [
						{
							item_id: resource.id,
							resource_id: '000000000000000000000000000000E1',
							children: [],
						},
					],
				},
			],
		});
	});

	test('should not go into infinite loop when a note links to itself', async () => {
		const { session } = await createUserAndSession();

		const rootNote = await createNote(session.id, {
			id: '00000000000000000000000000000001',
			body: '![](:/00000000000000000000000000000002)',
		});

		const linkedNote = await createNote(session.id, {
			id: '00000000000000000000000000000002',
			title: 'Linked note 2',
			body: '![](:/00000000000000000000000000000001)',
		});

		const tree = await models().itemResource().itemTree(rootNote.id, rootNote.jop_id);

		expect(tree).toEqual({
			item_id: rootNote.id,
			resource_id: '00000000000000000000000000000001',
			children: [
				{
					item_id: linkedNote.id,
					resource_id: '00000000000000000000000000000002',
					children: [
						{
							item_id: rootNote.id,
							resource_id: '00000000000000000000000000000001',
							children: [], // Empty to prevent an infinite loop
						},
					],
				},
			],
		});
	});

});
