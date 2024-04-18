import { useMemo, useRef } from 'react';
import { FolderListItem, HeaderListItem, ListItem, ListItemType, TagListItem } from '../types';
import { FolderEntity, TagsWithNoteCountEntity } from '@joplin/lib/services/database/types';
import { renderFolders, renderTags } from '@joplin/lib/components/shared/side-menu-shared';
import { _ } from '@joplin/lib/locale';
import CommandService from '@joplin/lib/services/CommandService';

interface Props {
	tags: TagsWithNoteCountEntity[];
	folders: FolderEntity[];
	notesParentType: string;
	selectedTagId: string;
	selectedFolderId: string;
	collapsedFolderIds: string[];
}

const onAddFolderButtonClick = () => {
	void CommandService.instance().execute('newFolder');
};

const useSidebarListData = (props: Props): ListItem[] => {
	const tagItems = useMemo(() => {
		const renderProps = {
			tags: props.tags,
			notesParentType: props.notesParentType,
			selectedTagId: props.selectedTagId,
		};

		return renderTags<ListItem>(renderProps, (tag, selected): TagListItem => {
			return {
				kind: ListItemType.Tag,
				selected,
				tag,
			};
		});
	}, [props.tags, props.notesParentType, props.selectedTagId]);


	// TODO: HACK: Prevents folderItems from rerendering unnecessarily which can be very slow.
	const selectedFolderIdRef = useRef<string>();
	selectedFolderIdRef.current = props.selectedFolderId;
	const notesParentTypeRef = useRef<string>();
	notesParentTypeRef.current = props.notesParentType;

	const folderItems = useMemo(() => {
		const renderProps = {
			folders: props.folders,
			collapsedFolderIds: props.collapsedFolderIds,

			selectedFolderId: selectedFolderIdRef.current,
			notesParentType: notesParentTypeRef.current,
		};
		return renderFolders<ListItem>(renderProps, (folder, _selected, hasChildren, depth): FolderListItem => {
			return {
				kind: ListItemType.Notebook,
				folder,
				hasChildren,
				depth,
			};
		});
	}, [props.folders, props.collapsedFolderIds]);

	return useMemo(() => {
		const notebooksHeader: HeaderListItem = {
			kind: ListItemType.Header,
			label: _('Notebooks'),
			iconName: 'icon-notebooks',
			id: 'folderHeader',
			onClick: null,
			onPlusButtonClick: onAddFolderButtonClick,
			extraProps: {
				['data-folder-id']: '',
				toggleblock: '1',
			},
			supportsFolderDrop: true,
		};
		const tagsHeader: HeaderListItem = {
			kind: ListItemType.Header,
			label: _('Tags'),
			iconName: 'icon-tags',
			id: 'tagHeader',
			onClick: null,
			onPlusButtonClick: null,
			extraProps: {
				toggleblock: '1',
			},
			supportsFolderDrop: false,
		};
		const items: ListItem[] = [
			notebooksHeader,
			{ kind: ListItemType.AllNotes },
			...folderItems.items,
			tagsHeader,
			...tagItems.items,
		];
		return items;
	}, [tagItems, folderItems]);
};

export default useSidebarListData;
