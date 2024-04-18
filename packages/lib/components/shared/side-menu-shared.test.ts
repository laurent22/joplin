import { FolderEntity } from '../../services/database/types';
import { getTrashFolder, getTrashFolderId } from '../../services/trash';
import { renderFolders } from './side-menu-shared';

const renderItem = (folder: FolderEntity, hasChildren: boolean, depth: number) => {
	return [folder.id, hasChildren, depth];
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
					['1', true, 0],
					['3', false, 1],
					['2', false, 0],
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
					['1', false, 0],
					[getTrashFolderId(), true, 0],
					['2', false, 1],
				],
				order: ['1', getTrashFolderId(), '2'],
			},
		],
	])('should render folders', (props, expected) => {
		const actual = renderFolders(props, renderItem);
		expect(actual).toEqual(expected);
	});

});
