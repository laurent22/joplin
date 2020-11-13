export enum LayoutItemDirection {
	Row = 'row',
	Column = 'column',
}

export interface Size {
	width: number;
	height: number;
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
	context?: any;
}

export const tempContainerPrefix = 'tempContainer-';
