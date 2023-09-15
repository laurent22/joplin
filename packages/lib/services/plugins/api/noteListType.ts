import { ItemRendererDatabaseDependency } from '../../database/types';
import { Size } from '@joplin/utils/types';

export enum ItemFlow {
	TopToBottom = 'topToBottom',
	LeftToRight = 'leftToRight',
}

export type RenderNoteView = Record<string, any>;

export interface OnChangeEvent {
	elementId: string;
	value: any;
	noteId: string;
}

export type OnRenderNoteHandler = (props: any)=> Promise<RenderNoteView>;
export type OnChangeHandler = (event: OnChangeEvent)=> Promise<void>;

export type ListRendererDepependency =
	ItemRendererDatabaseDependency |
	'item.size.width' |
	'item.size.height' |
	'item.selected' |
	'note.titleHtml' |
	'note.isWatched';

export interface ListRenderer {
	flow: ItemFlow;
	itemSize: Size;
	itemCss?: string;
	dependencies: ListRendererDepependency[];
	itemTemplate: string;
	onRenderNote: OnRenderNoteHandler;
	onChange?: OnChangeHandler;
}
