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
	tempResource: {
		data: any; // string or Uint8Array
		mime: string;
		filename: string;
	};
	linkToCopy: string;
	textToCopy: string;
	htmlToCopy: string;
	insertContent: Function;
	isReadOnly?: boolean;
	isTemp?: boolean;
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
	const filename = resource ? (resource.filename ? resource.filename : resource.title) : options.tempResource && options.tempResource.filename ? options.tempResource.filename : '';
	const getCopyPath = () => {
		if (options.tempResource) {
			return tempResourceToDataUri(options.tempResource);
		}
		return filePath;
	};
	return { resource, filePath, filename, getCopyPath };
}

export function tempResourceToDataUri(tempResource: ContextMenuOptions['tempResource']): string {
	const mime = tempResource.mime;
	return mime ? `data:${mime};base64,${Buffer.from(tempResource.data).toString('base64')}` : null;
}
