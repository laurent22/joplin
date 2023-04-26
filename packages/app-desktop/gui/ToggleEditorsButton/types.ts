import { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';

export enum Value {
	Markdown = 'markdown',
	RichText = 'richText',
}

export interface Props {
	themeId: number;
	value: Value;
	toolbarButtonInfo: ToolbarButtonInfo;
}
