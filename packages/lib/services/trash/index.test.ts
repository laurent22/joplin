import { getDisplayParentId, getTrashFolderId } from '.';
import { ModelType } from '../../BaseModel';

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
	])('should return the display parent ID (case %#)', (item, itemParent, expected) => {
		const defaultProps = { type_: ModelType.Folder };
		const actual = getDisplayParentId({ ...defaultProps, ...item }, { ...defaultProps, ...itemParent });
		expect(actual).toBe(expected);
	});

});
