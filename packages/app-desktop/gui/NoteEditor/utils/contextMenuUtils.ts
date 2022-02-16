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

export async function resourceInfo(options: ContextMenuOptions): Promise<any> {
	const resource = options.resourceId ? await Resource.load(options.resourceId) : null;
	const filePath = resource ? Resource.fullPath(resource) : null;
	const filename = resource ? (resource.filename ? resource.filename : resource.title) : options.filename ? options.filename : '';
	const getCopyPath = () => {
		if (options.textToCopy && options.mime) {
			return textToDataUri(options.textToCopy, options.mime);
		}
		return filePath;
	};
	return { resource, filePath, filename, getCopyPath };
}

export function textToDataUri(text: string, mime: string): string {
	return `data:${mime};base64,${Buffer.from(text).toString('base64')}`;
}

export const svgUriToPng = (document: Document, svg: string) => new Promise((resolve, reject) => {
	let canvas: HTMLCanvasElement;
	let ctx;
	const img = document.createElement('img');

	const cleanUpAndReject = () => {
		if (canvas) canvas.remove();
		if (img) img.remove();
		return reject();
	};

	if (!img) return cleanUpAndReject();
	img.onload = function() {
		canvas = document.createElement('canvas');
		if (!canvas) return cleanUpAndReject();
		canvas.width = img.width;
		canvas.height = img.height;
		ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, img.width, img.height);
		const pngUri = canvas.toDataURL('image/png');
		if (!pngUri) return cleanUpAndReject();
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
	};
	img.onerror = cleanUpAndReject;
	img.src = svg;
});
