import { useMemo } from 'react';
import { FolderListItem, HeaderId, HeaderListItem, ListItem, ListItemType, TagListItem } from '../types';
import { FolderEntity, TagsWithNoteCountEntity } from '@joplin/lib/services/database/types';
import { buildFolderTree, renderFolders, renderTags } from '@joplin/lib/components/shared/side-menu-shared';
import { _ } from '@joplin/lib/locale';
import CommandService from '@joplin/lib/services/CommandService';
import toggleHeader from './toggleHeader';

interface Props {
	tags: TagsWithNoteCountEntity[];
	folders: FolderEntity[];
	collapsedFolderIds: string[];
	folderHeaderIsExpanded: boolean;
	tagHeaderIsExpanded: boolean;
}

const onAddFolderButtonClick = () => {
	void CommandService.instance().execute('newFolder');
};

const useSidebarListData = (props: Props): ListItem[] => {
	const tagItems = useMemo(() => {
		return renderTags<ListItem>(props.tags, (tag): TagListItem => {
			return {
				kind: ListItemType.Tag,
				tag,
				key: tag.id,
			};
		});
	}, [props.tags]);

	const folderTree = useMemo(() => {
		return buildFolderTree(props.folders);
	}, [props.folders]);

	const folderItems = useMemo(() => {
		const renderProps = {
			folderTree,
			collapsedFolderIds: props.collapsedFolderIds,
		};
		return renderFolders<ListItem>(renderProps, (folder, hasChildren, depth): FolderListItem => {
			return {
				kind: ListItemType.Folder,
				folder,
				hasChildren,
				depth,
				key: folder.id,
			};
		});
	}, [folderTree, props.collapsedFolderIds]);

	return useMemo(() => {
		const foldersHeader: HeaderListItem = {
			kind: ListItemType.Header,
			label: _('Notebooks'),
			iconName: 'icon-notebooks',
			expanded: props.folderHeaderIsExpanded,
			id: HeaderId.FolderHeader,
			key: HeaderId.FolderHeader,
			onClick: toggleHeader,
			onPlusButtonClick: onAddFolderButtonClick,
			extraProps: {
				['data-folder-id']: '',
			},
			supportsFolderDrop: true,
		};
		const foldersSectionContent: ListItem[] = props.folderHeaderIsExpanded ? [
			{ kind: ListItemType.AllNotes, key: 'all-notes' },
			...folderItems.items,
			{ kind: ListItemType.Spacer, key: 'after-folders-spacer' },
		] : [];

		const tagsHeader: HeaderListItem = {
			kind: ListItemType.Header,
			label: _('Tags'),
			iconName: 'icon-tags',
			expanded: props.tagHeaderIsExpanded,
			id: HeaderId.TagHeader,
			key: HeaderId.TagHeader,
			onClick: toggleHeader,
			onPlusButtonClick: null,
			extraProps: { },
			supportsFolderDrop: false,
		};
		const tagsSectionContent: ListItem[] = props.tagHeaderIsExpanded ? tagItems.items : [];

		const items: ListItem[] = [
			foldersHeader,
			...foldersSectionContent,
			tagsHeader,
			...tagsSectionContent,
		];
		return items;
	}, [tagItems, folderItems, props.folderHeaderIsExpanded, props.tagHeaderIsExpanded]);
};

export default useSidebarListData;
