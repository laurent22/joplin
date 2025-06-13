import { FolderEntity, TagsWithNoteCountEntity } from '@joplin/lib/services/database/types';
import { DragEventHandler, MouseEventHandler, MouseEvent as ReactMouseEvent } from 'react';

export enum HeaderId {
	TagHeader = 'tagHeader',
	FolderHeader = 'folderHeader',
}

export enum ListItemType {
	Header = 'header',
	Tag = 'tag',
	Folder = 'folder',
	AllNotes = 'all-notes',
	Spacer = 'spacer',
}

interface BaseListItem {
	key: string;
	depth: number;
	hasChildren: boolean;
}

interface ToplevelListItem extends BaseListItem {
	depth: 1;
}

export interface HeaderListItem extends ToplevelListItem {
	kind: ListItemType.Header;
	label: string;
	expanded: boolean;
	iconName: string;
	id: HeaderId;
	onClick: ((headerId: HeaderId, event: ReactMouseEvent<HTMLElement>)=> void)|null;
	extraProps: Record<string, string>;
	supportsFolderDrop: boolean;
}

export interface AllNotesListItem extends BaseListItem {
	kind: ListItemType.AllNotes;
}

export interface TagListItem extends BaseListItem {
	kind: ListItemType.Tag;
	tag: TagsWithNoteCountEntity;
}

export interface FolderListItem extends BaseListItem {
	kind: ListItemType.Folder;
	folder: FolderEntity;
	hasChildren: boolean;
}

export interface SpacerListItem extends ToplevelListItem {
	kind: ListItemType.Spacer;
}

export type ListItem = HeaderListItem|AllNotesListItem|TagListItem|FolderListItem|SpacerListItem;


export type SetSelectedIndexCallback = (newIndex: number)=> void;


export type ItemDragListener = DragEventHandler<HTMLElement>;
export type ItemContextMenuListener = MouseEventHandler<HTMLElement>;
export type ItemClickListener = MouseEventHandler<HTMLElement>;

export interface SidebarCommandRuntimeProps {
	focusSidebar: ()=> void;
}
