import Resource from '@joplin/lib/models/Resource';
import Logger from '@joplin/utils/Logger';
import bridge from '../../../services/bridge';
import { HtmlToMarkdownHandler, MarkupToHtmlHandler } from './types';
import { ContextMenuItemType, EditContextMenuFilterObject } from '@joplin/lib/services/plugins/api/types';
import eventManager from '@joplin/lib/eventManager';
import CommandService from '@joplin/lib/services/CommandService';
import { type MenuItem as MenuItemType } from 'electron';
import BaseItem from '@joplin/lib/models/BaseItem';
import { ModelType } from '@joplin/lib/BaseModel';

const MenuItem = bridge().MenuItem;
const logger = Logger.create('contextMenuUtils');

// Re-export for backward compatibility
export { ContextMenuItemType };

// Resolves whether a resource-type item is actually a note link.
// Falls back to Resource on error or if the item is not found.
export const resolveContextMenuItemType = async (itemType: ContextMenuItemType, resourceId: string): Promise<ContextMenuItemType> => {
	if (itemType !== ContextMenuItemType.Resource || !resourceId) return itemType;
	try {
		const item = await BaseItem.loadItemById(resourceId);
		if (item?.type_ === ModelType.Note) return ContextMenuItemType.NoteLink;
	} catch (error) {
		logger.warn('resolveContextMenuItemType: failed to load item, defaulting to Resource', error);
	}
	return ContextMenuItemType.Resource;
};

export interface ContextMenuOptions {
	itemType: ContextMenuItemType;
	resourceId: string;
	mime: string;
	filename: string;
	linkToOpen: string;
	linkToCopy: string;
	textToCopy: string;
	htmlToCopy: string;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	insertContent: Function;
	isReadOnly?: boolean;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	fireEditorEvent: Function;
	htmlToMd: HtmlToMarkdownHandler;
	mdToHtml: MarkupToHtmlHandler;
}

export interface ContextMenuItem {
	label: string;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onAction: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	isActive: Function;
	isSeparator?: boolean;
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
		({ width, height } = document.querySelector<HTMLIFrameElement>('.noteTextViewer').contentWindow.document.querySelector(`#${id}`).getBoundingClientRect());
	} catch (error) {
		logger.warn('Could not get SVG dimensions.');
		logger.warn('Error was: ', error);
	}
	if (!width || !height) {
		return [undefined, undefined];
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
				if (!width || !height) {
					const maxDimension = 1024;
					if (img.width > img.height) {
						width = maxDimension;
						height = width * (img.height / img.width);
					} else {
						height = maxDimension;
						width = height * (img.width / img.height);
					}
				}
				canvas.width = width;
				canvas.height = height;
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
			} catch (error) {
				cleanUpAndReject(error);
			}
		};
		img.onerror = function(e) {
			cleanUpAndReject(new Error(e.toString()));
		};
		img.src = svg;
	});
};

// Filter out leading, trailing, and consecutive separators from a list
const filterSeparators = <T>(items: T[], isSeparator: (item: T)=> boolean): T[] => {
	const filtered: T[] = [];
	let lastWasSeparator = true;
	for (const item of items) {
		if (isSeparator(item)) {
			if (lastWasSeparator) continue;
			lastWasSeparator = true;
		} else {
			lastWasSeparator = false;
		}
		filtered.push(item);
	}

	while (filtered.length > 0 && isSeparator(filtered[filtered.length - 1])) {
		filtered.pop();
	}

	return filtered;
};

export interface EditorContextMenuFilterContext {
	resourceId?: string;
	itemType?: ContextMenuItemType;
	textToCopy?: string;
}

export const handleEditorContextMenuFilter = async (context?: EditorContextMenuFilterContext) => {
	let filterObject: EditContextMenuFilterObject = {
		items: [],
		context,
	};

	filterObject = await eventManager.filterEmit('editorContextMenu', filterObject);

	const filteredItems = filterSeparators(filterObject.items, item => item.type === 'separator');

	const output: MenuItemType[] = [];
	for (const item of filteredItems) {
		output.push(new MenuItem({
			label: item.label,
			click: async () => {
				const args = item.commandArgs || [];
				void CommandService.instance().execute(item.commandName, ...args);
			},
			type: item.type,
		}));
	}

	return output;
};

export interface BuildMenuItemsOptions {
	excludeEditItems?: boolean;
	excludePluginItems?: boolean;
}

export const buildMenuItems = async (items: ContextMenuItems, options: ContextMenuOptions, buildOptions?: BuildMenuItemsOptions) => {
	const editItemKeys = ['cut', 'copy', 'paste', 'pasteAsText', 'separator4'];
	const activeItems: ContextMenuItem[] = [];
	for (const itemKey in items) {
		if (buildOptions?.excludeEditItems && editItemKeys.includes(itemKey)) continue;
		const item = items[itemKey];
		if (item.isActive(options.itemType, options)) {
			activeItems.push(item);
		}
	}

	if (!buildOptions?.excludePluginItems) {
		const extraItems = await handleEditorContextMenuFilter({
			resourceId: options.resourceId,
			itemType: options.itemType,
			textToCopy: options.textToCopy,
		});

		if (extraItems.length) {
			activeItems.push({
				isActive: () => true,
				label: '',
				onAction: () => {},
				isSeparator: true,
			});
		}

		for (const [, extraItem] of extraItems.entries()) {
			activeItems.push({
				isActive: () => true,
				label: extraItem.label,
				onAction: () => {
					extraItem.click();
				},
				isSeparator: extraItem.type === 'separator',
			});
		}
	}

	const filteredItems = filterSeparators(activeItems, item => item.isSeparator);

	return filteredItems.map(item => new MenuItem({
		label: item.label,
		click: () => {
			item.onAction(options);
		},
		type: item.isSeparator ? 'separator' : 'normal',
	}));
};
