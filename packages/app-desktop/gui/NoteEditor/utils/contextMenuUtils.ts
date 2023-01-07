import Resource from '@joplin/lib/models/Resource';

export enum ContextMenuItemType {
	None = '',
	Image = 'image',
	Resource = 'resource',
	Text = 'text',
	Link = 'link',
}

export interface ContextMenuOptions {
	itemType: ContextMenuItemType;
	resourceId: string;
	mime: string;
	filename: string;
	linkToCopy: string;
	textToCopy: string;
	htmlToCopy: string;
	insertContent: Function;
	isReadOnly?: boolean;
}

export interface ContextMenuItem {
	label: string;
	onAction: Function;
	isActive: Function;
}

export interface ContextMenuItems {
	[key: string]: ContextMenuItem;
}

export async function resourceInfo(options: ContextMenuOptions) {
	const resource = options.resourceId ? await Resource.load(options.resourceId) : null;
	const resourcePath = resource ? Resource.fullPath(resource) : null;
	const filename = resource ? (resource.filename ? resource.filename : resource.title) : options.filename ? options.filename : '';
	return { resource, resourcePath, filename };
}

export function textToDataUri(text: string, mime: string): string {
	return `data:${mime};base64,${Buffer.from(text).toString('base64')}`;
}
export const svgDimensions = (document: Document, svg: string) => {
	let width: number;
	let height: number;
	try {
		const parser = new DOMParser();
		const id = parser.parseFromString(svg, 'text/html').querySelector('svg').id;
		({ width , height } = document.querySelector<HTMLIFrameElement>('.noteTextViewer').contentWindow.document.querySelector(`#${id}`).getBoundingClientRect());
	} catch {
		// do nothing
	}
	if (!width || !height) {
		return [undefined,undefined];
	}
	return [width, height];
};
export const svgUriToPng = (document: Document, svg: string, width: number, height: number) => {
	return new Promise<Uint8Array>((resolve, reject) => {
		let canvas: HTMLCanvasElement;
		let img: HTMLImageElement;

		const cleanUpAndReject = (e: Error) => {
			if (canvas) canvas.remove();
			if (img) img.remove();
			return reject(e);
		};

		try {
			img = document.createElement('img');
			if (!img) throw new Error('Failed to create img element');
		} catch (e) {
			return cleanUpAndReject(e);
		}

		img.onload = function() {
			try {
				canvas = document.createElement('canvas');
				if (!canvas) throw new Error('Failed to create canvas element');
				canvas.width = width || img.width;
				canvas.height = height || img.height;
				const ctx = canvas.getContext('2d');
				if (!ctx) throw new Error('Failed to get context');
				ctx.drawImage(img, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
				const pngUri = canvas.toDataURL('image/png');
				if (!pngUri) throw new Error('Failed to generate png uri');
				const pngBase64 = pngUri.split(',')[1];
				const byteString = atob(pngBase64);
				// write the bytes of the string to a typed array
				const buff = new Uint8Array(byteString.length);
				for (let i = 0; i < byteString.length; i++) {
					buff[i] = byteString.charCodeAt(i);
				}
				canvas.remove();
				img.remove();
				resolve(buff);
			} catch (err) {
				cleanUpAndReject(err);
			}
		};
		img.onerror = function(e) {
			cleanUpAndReject(new Error(e.toString()));
		};
		img.src = svg;
	});
};
