	type ImageObject = {
		width: number;
		height: number;
		naturalWidth: number;
		naturalHeight: number;
	};
export function getImageSizes(element: HTMLElement, forceAbsoluteUrls: boolean): ImageObject[];

	type StyleSheetObject = {
		type: string;
		value: string;
	};

export function getStyleSheets(doc: Document): StyleSheetObject[];
