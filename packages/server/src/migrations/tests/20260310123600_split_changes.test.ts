import { ChangeType, ItemType } from '../../services/database/types';
import { shareFolderWithUser } from '../../utils/testing/shareApiUtils';
import { beforeAllDb, afterAllTests, beforeEachDb, db, createUserAndSession } from '../../utils/testing/testUtils';
import { down, up } from '../20260310123600_split_changes';

describe('20260310123600_split_changes', () => {

	beforeAll(async () => {
		await beforeAllDb('20260310123600_split_changes');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		await beforeEachDb();
	});

	test('should migrate down', async () => {
		const { session: session1 } = await createUserAndSession(1);
		const { session: session2 } = await createUserAndSession(2);

		const { share } = await shareFolderWithUser(session1.id, session2.id, '000000000000000000000000000000F1', {
			'000000000000000000000000000000F1': {
				'00000000000000000000000000000001': null,
			},
		});

		await db()('changes').truncate();
		await db()('changes_2').truncate();

		// Run the migration to ensure that the initial migration marker change is
		// added to changes_2.
		await down(db());
		await up(db());

		expect(await db()('changes_2').select('*')).toHaveLength(1);

		// Since this is testing a migration, use db() directly, rather than models().changes.
		const changeBaseProperties = {
			type: ChangeType.Update,
			item_id: '1234567890',
			item_name: 'some name here',

			updated_time: 1234,
			created_time: 1234,

			user_id: session1.user_id,
			item_type: ItemType.UserItem,
			previous_share_id: '',
		};

		await db()('changes_2').insert([
			{
				...changeBaseProperties,

				id: '0aaaaaaaaaaaaaaaaaaa',
				counter: 2,
				previous_share_id: share.id,
				type: ChangeType.Update,
			},
			{
				...changeBaseProperties,

				id: '0aaaaaaaaaaaaaaaaaa1',
				counter: 3,
				previous_share_id: share.id,
				type: ChangeType.Delete,
			},
		]);

		await down(db());

		const updatedChanges = await db()('changes').select('*').orderBy('counter');

		// Should have converted the changes_2 changes to changes-format changes:
		expect(updatedChanges).toMatchObject([
			{
				counter: 1,
				id: '0aaaaaaaaaaaaaaaaaaa',
				user_id: session1.user_id,
				type: ChangeType.Update,
			},
			{
				counter: 2,
				id: '0aaaaaaaaaaaaaaaaaa1',
				user_id: session1.user_id,
				type: ChangeType.Delete,
			},
		]);
		// Check the previous_item value separately (by parsing), since the exact formatting
		// of the JSON isn't guaranteed
		expect(
			updatedChanges
				.map(change => change.previous_item)
				.map(item => JSON.parse(item)),
		).toMatchObject([
			{ jop_share_id: share.id },
			{ jop_share_id: share.id },
		]);
	});

});
