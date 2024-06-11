import { useMemo } from 'react';
import { FolderListItem, HeaderId, HeaderListItem, ListItem, ListItemType, TagListItem } from '../types';
import { FolderEntity, TagsWithNoteCountEntity } from '@joplin/lib/services/database/types';
import { renderFolders, renderTags } from '@joplin/lib/components/shared/side-menu-shared';
import { _ } from '@joplin/lib/locale';
import CommandService from '@joplin/lib/services/CommandService';
import Setting from '@joplin/lib/models/Setting';

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

const onHeaderClick = (headerId: HeaderId) => {
	const settingKey = headerId === HeaderId.TagHeader ? 'tagHeaderIsExpanded' : 'folderHeaderIsExpanded';
	const current = Setting.value(settingKey);
	Setting.setValue(settingKey, !current);
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


	const folderItems = useMemo(() => {
		const renderProps = {
			folders: props.folders,
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
	}, [props.folders, props.collapsedFolderIds]);

	return useMemo(() => {
		const foldersHeader: HeaderListItem = {
			kind: ListItemType.Header,
			label: _('Notebooks'),
			iconName: 'icon-notebooks',
			id: HeaderId.FolderHeader,
			key: HeaderId.FolderHeader,
			onClick: onHeaderClick,
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
			id: HeaderId.TagHeader,
			key: HeaderId.TagHeader,
			onClick: onHeaderClick,
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
