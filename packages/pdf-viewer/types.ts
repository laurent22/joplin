export interface ScaledSize {
	height: number;
	width: number;
	scale: number;
}

export interface IconButtonProps {
    onClick: ()=> void;
    size?: number;
    color?: string;
}

export interface RenderRequest {
	pageNo: number;
	scaledSize: ScaledSize;
	getTextLayer: boolean;
	isCancelled: ()=> boolean;
}

export interface RenderResult {
	canvas: HTMLCanvasElement;
	textLayerDiv: HTMLDivElement;
}

export enum MarkupTool {
	Highlight = 'Highlight',
	StrikeThrough = 'StrikeThrough',
	Underline = 'Underline',
    Erase = 'Erase',
}

export enum MarkupColor {
	Yellow = 'Yellow',
	Green = 'Green',
	Blue = 'Blue',
	Red = 'Red',
	Purple = 'Purple',
}

export type MarkupState = {
	isEnabled: boolean;
	currentTool: MarkupTool;
	color: MarkupColor;
};

export enum MarkupActionType {
	Toggle = 'toggle',
	Tool = 'setTool',
	Color = 'setColor',
}

export type MarkupAction = {
	type: MarkupActionType;
	value?: any;
};
