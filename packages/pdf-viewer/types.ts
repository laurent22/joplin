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
