import { ModelType } from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import { File, Item, Share, Uuid } from '../../db';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { MarkupToHtml } from '@joplin/renderer';
import Setting from '@joplin/lib/models/Setting';
import Resource from '@joplin/lib/models/Resource';
import { ErrorNotFound } from '../../utils/errors';
import BaseApplication from '../../services/BaseApplication';
import { formatDateTime } from '../../utils/time';
import ItemModel from '../../models/ItemModel';
const { themeStyle } = require('@joplin/lib/theme');

export interface FileViewerResponse {
	body: any;
	mime: string;
	size: number;
}

interface ResourceInfo {
	localState: any;
	item: any;
}

interface LinkedItemInfo {
	item: any;
	file: File;
}

type LinkedItemInfos = Record<Uuid, LinkedItemInfo>;

type ResourceInfos = Record<Uuid, ResourceInfo>;

export default class Application extends BaseApplication {

	private pluginAssetRootDir_: string;

	public async initialize() {
		this.mustache.prefersDarkEnabled = false;
		this.pluginAssetRootDir_ = require('path').resolve(__dirname, '../../..', 'node_modules/@joplin/renderer/assets');
	}

	public async localFileFromUrl(url: string): Promise<string> {
		const pluginAssetPrefix = 'apps/joplin/pluginAssets/';

		if (url.indexOf(pluginAssetPrefix) === 0) {
			return `${this.pluginAssetRootDir_}/${url.substr(pluginAssetPrefix.length)}`;
		}

		return null;
	}

	private async resourceInfos(linkedItemInfos: LinkedItemInfos): Promise<ResourceInfos> {
		const output: Record<string, any> = {};

		for (const itemId of Object.keys(linkedItemInfos)) {
			const info = linkedItemInfos[itemId];

			if (info.item.type_ !== ModelType.Resource) continue;

			output[info.item.id] = {
				item: info.item,
				localState: {
					fetch_status: Resource.FETCH_STATUS_DONE,
				},
			};
		}

		return output;
	}

	private async noteLinkedItemInfos(userId: Uuid, itemModel: ItemModel, note: NoteEntity): Promise<LinkedItemInfos> {
		const jopIds = await Note.linkedItemIds(note.body);
		const output: LinkedItemInfos = {};

		for (const jopId of jopIds) {
			const item = await itemModel.loadByJopId(userId, jopId, { fields: ['*'] });
			if (!item) continue;

			output[jopId] = {
				item: itemModel.itemToJoplinItem(item),
				file: null,// itemFileWithContent.file,
			};
		}

		return output;
	}

	private async renderResource(item: Item, content: any): Promise<FileViewerResponse> {
		return {
			body: content,
			mime: item.mime_type,
			size: item.content_size,
		};
	}

	private async renderNote(share: Share, note: NoteEntity, resourceInfos: ResourceInfos, linkedItemInfos: LinkedItemInfos): Promise<FileViewerResponse> {
		const markupToHtml = new MarkupToHtml({
			ResourceModel: Resource,
		});

		const renderOptions: any = {
			resources: resourceInfos,

			itemIdToUrl: (itemId: Uuid) => {
				if (!linkedItemInfos[itemId]) return '#';

				const item = linkedItemInfos[itemId].item;
				if (!item) throw new Error(`No such item in this note: ${itemId}`);

				if (item.type_ === ModelType.Note) {
					return '#';
				} else if (item.type_ === ModelType.Resource) {
					return `${this.models.share().shareUrl(share.id)}?resource_id=${item.id}&t=${item.updated_time}`;
				} else {
					throw new Error(`Unsupported item type: ${item.type_}`);
				}
			},

			// Switch-off the media players because there's no option to toggle
			// them on and off.
			audioPlayerEnabled: false,
			videoPlayerEnabled: false,
			pdfViewerEnabled: false,
		};

		const result = await markupToHtml.render(note.markup_language, note.body, themeStyle(Setting.THEME_LIGHT), renderOptions);

		const bodyHtml = await this.mustache.renderView({
			cssFiles: ['note'],
			jsFiles: ['note'],
			name: 'note',
			path: 'note',
			content: {
				note: {
					...note,
					bodyHtml: result.html,
					updatedDateTime: formatDateTime(note.updated_time),
				},
				cssStrings: result.cssStrings.join('\n'),
				assetsJs: `
					const joplinNoteViewer = {
						pluginAssets: ${JSON.stringify(result.pluginAssets)},
						appBaseUrl: ${JSON.stringify(this.appBaseUrl)},
					};
				`,
			},
		});

		return {
			body: bodyHtml,
			mime: 'text/html',
			size: bodyHtml.length,
		};
	}

	public async renderItem(userId: Uuid, item: Item, share: Share, query: Record<string, any>): Promise<FileViewerResponse> {
		const itemModel = this.models.item();

		const rootNote: NoteEntity = itemModel.itemToJoplinItem(item); // await this.unserializeItem(content);
		const linkedItemInfos: LinkedItemInfos = await this.noteLinkedItemInfos(userId, itemModel, rootNote);
		const resourceInfos = await this.resourceInfos(linkedItemInfos);

		const fileToRender = {
			item: item,
			content: null as any,
			itemId: rootNote.id,
		};

		if (query.resource_id) {
			const resourceItem = await itemModel.loadByName(userId, `.resource/${query.resource_id}`, { fields: ['*'] });
			fileToRender.item = resourceItem;
			fileToRender.content = resourceItem.content;
			fileToRender.itemId = query.resource_id;
		}

		if (fileToRender.item !== item && !linkedItemInfos[fileToRender.itemId]) {
			throw new ErrorNotFound(`Item "${fileToRender.itemId}" does not belong to this note`);
		}

		const itemToRender = fileToRender.item === item ? rootNote : linkedItemInfos[fileToRender.itemId].item;
		const itemType: ModelType = itemToRender.type_;

		if (itemType === ModelType.Resource) {
			return this.renderResource(fileToRender.item, fileToRender.content);
		} else if (itemType === ModelType.Note) {
			return this.renderNote(share, itemToRender, resourceInfos, linkedItemInfos);
		} else {
			throw new Error(`Cannot render item with type "${itemType}"`);
		}
	}

}
