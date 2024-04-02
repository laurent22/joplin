import { FolderEntity } from '../../services/database/types';
import { getTrashFolder, getTrashFolderId } from '../../services/trash';
import { RenderFolderItem, renderFolders } from './side-menu-shared';

const renderItem: RenderFolderItem = (folder: FolderEntity, selected: boolean, hasChildren: boolean, depth: number) => {
	return [folder.id, selected, hasChildren, depth];
};

describe('side-menu-shared', () => {

	test.each([
		[
			{
				collapsedFolderIds: [],
				folders: [],
				notesParentType: 'Folder',
				selectedFolderId: '',
				selectedTagId: '',
			},
			{
				items: [],
				order: [],
			},
		],

		[
			{
				collapsedFolderIds: [],
				folders: [
					{
						id: '1',
						parent_id: '',
						deleted_time: 0,
					},
					{
						id: '2',
						parent_id: '',
						deleted_time: 0,
					},
					{
						id: '3',
						parent_id: '1',
						deleted_time: 0,
					},
				],
				notesParentType: 'Folder',
				selectedFolderId: '2',
				selectedTagId: '',
			},
			{
				items: [
					['1', false, true, 0],
					['3', false, false, 1],
					['2', true, false, 0],
				],
				order: ['1', '3', '2'],
			},
		],

		[
			{
				collapsedFolderIds: [],
				folders: [
					{
						id: '1',
						parent_id: '',
						deleted_time: 0,
					},
					{
						id: '2',
						parent_id: '',
						deleted_time: 1000,
					},
					getTrashFolder(),
				],
				notesParentType: 'Folder',
				selectedFolderId: '',
				selectedTagId: '',
			},
			{
				items: [
					['1', false, false, 0],
					[getTrashFolderId(), false, true, 0],
					['2', false, false, 1],
				],
				order: ['1', getTrashFolderId(), '2'],
			},
		],
	])('should render folders', (props, expected) => {
		const actual = renderFolders(props, renderItem);
		expect(actual).toEqual(expected);
	});

});
