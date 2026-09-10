export type QuickActionType = 'newNote' | 'newTodo' | 'newPhoto' | 'newResource' | 'newDrawing';

export interface WidgetConfigItem {
	type: QuickActionType;
	title: string;
}
