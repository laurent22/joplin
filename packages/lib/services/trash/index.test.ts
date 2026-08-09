import { getDisplayParentId, getTrashFolderId, itemIsInTrash } from '.';
import { ModelType } from '../../BaseModel';
import Folder from '../../models/Folder';

describe('services/trash', () => {

	test.each([
		[
			{
				deleted_time: 0,
				parent_id: '1',
				id: 'a',
			},
			{
				deleted_time: 0,
				id: '1',
			},
			'1',
		],
		[
			{
				deleted_time: 1000,
				parent_id: '1',
				id: 'b',
			},
			{
				deleted_time: 0,
				id: '1',
			},
			getTrashFolderId(),
		],
		[
			{
				deleted_time: 1000,
				parent_id: '1',
				id: 'a',
			},
			{
				deleted_time: 1000,
				id: '1',
			},
			'1',
		],

		// should show non-deleted conflicts in the conflicts folder
		[
			{
				deleted_time: 0,
				is_conflict: 1,
				parent_id: Folder.conflictFolderId(),
				id: 'b',
			},
			Folder.conflictFolder(),
			Folder.conflictFolderId(),
		],
		// should show deleted conflicts in the trash folder
		[
			{
				deleted_time: 1000,
				is_conflict: 1,
				parent_id: Folder.conflictFolderId(),
				id: 'someidhere',
			},
			Folder.conflictFolder(),
			getTrashFolderId(),
		],
	])('should return the display parent ID (case %#)', (item, itemParent, expected) => {
		const defaultProps = { type_: ModelType.Folder };
		const actual = getDisplayParentId({ ...defaultProps, ...item }, { ...defaultProps, ...itemParent });
		expect(actual).toBe(expected);
	});

	test('should not throw for an item without a deleted_time property', () => {
		const oldNote = { id: '3c8ad8a9d33142d6b47717ae8e825df3' };
		expect(() => itemIsInTrash(oldNote)).not.toThrow();
		expect(itemIsInTrash(oldNote)).toBe(false);
	});
});
