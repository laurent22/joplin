import { FolderEntity, TagsWithNoteCountEntity } from '@joplin/lib/services/database/types';
import { DragEventHandler, MouseEventHandler, MouseEvent as ReactMouseEvent } from 'react';


export enum ListItemType {
	Header = 'header',
	Tag = 'tag',
	Notebook = 'notebook',
	AllNotes = 'all-notes',
}

export type HeaderListItem = {
	kind: ListItemType.Header;
	label: string;
	iconName: string;
	id: string;
	onClick: ((headerId: string, event: ReactMouseEvent<HTMLElement>)=> void)|null;
	onPlusButtonClick: MouseEventHandler<HTMLElement>|null;
	extraProps: Record<string, string>;
	supportsFolderDrop: boolean;
};

export type AllNotesListItem = {
	kind: ListItemType.AllNotes;
};

export type TagListItem = {
	kind: ListItemType.Tag;
	selected: boolean;
	tag: TagsWithNoteCountEntity;
};

export type FolderListItem = {
	kind: ListItemType.Notebook;
	folder: FolderEntity;
	hasChildren: boolean;
	depth: number;
};

export type ListItem = HeaderListItem|AllNotesListItem|TagListItem|FolderListItem;

export type ItemDragListener = DragEventHandler<HTMLElement>;
export type ItemContextMenuListener = MouseEventHandler<HTMLElement>;
export type ItemClickListener = MouseEventHandler<HTMLElement>;
