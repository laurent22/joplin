import { getDisplayParentId, getTrashFolderId } from '.';

describe('folders-screen-utils', () => {

	test.each([
		[
			{
				deleted_time: 0,
				parent_id: '1',
			},
			{
				deleted_time: 0,
			},
			'1',
		],
		[
			{
				deleted_time: 1000,
				parent_id: '1',
			},
			{
				deleted_time: 0,
			},
			getTrashFolderId(),
		],
		[
			{
				deleted_time: 1000,
				parent_id: '1',
			},
			{
				deleted_time: 1000,
			},
			'1',
		],
	])('should return the display parent ID', (item, itemParent, expected) => {
		const actual = getDisplayParentId(item, itemParent);
		expect(actual).toBe(expected);
	});

});
