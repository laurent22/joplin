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
