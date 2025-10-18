export enum LayoutItemDirection {
	Row = 'row',
	Column = 'column',
}

export interface Size {
	width: number;
	height: number;
}

export interface AutoSizeContext {
	naturalWidth?: number;
	naturalHeight?: number;
	rootWidth?: number;
	rootHeight?: number;
}

export interface LayoutItemContext {
	savedRootSize?: Size;
	autoSize?: AutoSizeContext;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	[key: string]: any;
}

export interface LayoutItem {
	key: string;
	isRoot?: boolean;
	width?: number;
	height?: number;
	minWidth?: number;
	minHeight?: number;
	children?: LayoutItem[];
	direction?: LayoutItemDirection;
	resizableRight?: boolean;
	resizableBottom?: boolean;
	visible?: boolean;
	context?: LayoutItemContext;
}

export const tempContainerPrefix = 'tempContainer-';
