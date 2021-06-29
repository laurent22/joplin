import JoplinDatabase from '@joplin/lib/JoplinDatabase';
// import Logger from '@joplin/lib/Logger';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import Resource from '@joplin/lib/models/Resource';
import NoteTag from '@joplin/lib/models/NoteTag';
import Tag from '@joplin/lib/models/Tag';
import MasterKey from '@joplin/lib/models/MasterKey';
import Revision from '@joplin/lib/models/Revision';
import { Config } from './types';
import * as fs from 'fs-extra';
import { Item, Share, Uuid } from '../db';
import ItemModel from '../models/ItemModel';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { formatDateTime } from './time';
import { ErrorNotFound } from './errors';
import { MarkupToHtml } from '@joplin/renderer';
import { OptionsResourceModel } from '@joplin/renderer/MarkupToHtml';
import { isValidHeaderIdentifier } from '@joplin/lib/services/EncryptionService';
const { DatabaseDriverNode } = require('@joplin/lib/database-driver-node.js');
import { themeStyle } from '@joplin/lib/theme';
import Setting from '@joplin/lib/models/Setting';
import { Models } from '../models/factory';
import MustacheService from '../services/MustacheService';

// const logger = Logger.create('JoplinUtils');

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

const pluginAssetRootDir_ = require('path').resolve(__dirname, '../..', 'node_modules/@joplin/renderer/assets');

let db_: JoplinDatabase = null;
let models_: Models = null;
let mustache_: MustacheService = null;
let baseUrl_: string = null;

export const resourceDirName = '.resource';

export async function initializeJoplinUtils(config: Config, models: Models, mustache: MustacheService) {
	models_ = models;
	baseUrl_ = config.baseUrl;
	mustache_ = mustache;

	const filePath = `${config.tempDir}/joplin.sqlite`;
	await fs.remove(filePath);

	db_ = new JoplinDatabase(new DatabaseDriverNode());
	// db_.setLogger(logger as Logger);
	await db_.open({ name: filePath });

	BaseModel.setDb(db_);

	// Only load the classes that will be needed to render the notes and
	// resources.
	BaseItem.loadClass('Folder', Folder);
	BaseItem.loadClass('Note', Note);
	BaseItem.loadClass('Resource', Resource);
	BaseItem.loadClass('Tag', Tag);
	BaseItem.loadClass('NoteTag', NoteTag);
	BaseItem.loadClass('MasterKey', MasterKey);
	BaseItem.loadClass('Revision', Revision);

	// mustache_ = new MustacheService(config.viewDir, config.baseUrl);
	// mustache_.prefersDarkEnabled = false;
}

export function linkedResourceIds(body: string): string[] {
	return Note.linkedItemIds(body);
}

export function isJoplinItemName(name: string): boolean {
	return !!name.match(/^[0-9a-zA-Z]{32}\.md$/);
}

export async function unserializeJoplinItem(body: string): Promise<any> {
	return BaseItem.unserialize(body);
}

export async function serializeJoplinItem(item: any): Promise<string> {
	const ModelClass = BaseItem.itemClass(item);
	return ModelClass.serialize(item);
}

export function resourceBlobPath(resourceId: string): string {
	return `${resourceDirName}/${resourceId}`;
}

export function isJoplinResourceBlobPath(path: string): boolean {
	return path.indexOf(resourceDirName) === 0;
}

export async function localFileFromUrl(url: string): Promise<string> {
	const cssPluginAssets = 'css/pluginAssets/';
	const jsPluginAssets = 'js/pluginAssets/';
	if (url.indexOf(cssPluginAssets) === 0) return `${pluginAssetRootDir_}/${url.substr(cssPluginAssets.length)}`;
	if (url.indexOf(jsPluginAssets) === 0) return `${pluginAssetRootDir_}/${url.substr(jsPluginAssets.length)}`;
	return null;
}

async function getResourceInfos(linkedItemInfos: LinkedItemInfos): Promise<ResourceInfos> {
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

async function noteLinkedItemInfos(userId: Uuid, itemModel: ItemModel, note: NoteEntity): Promise<LinkedItemInfos> {
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

async function renderResource(item: Item, content: any): Promise<FileViewerResponse> {
	return {
		body: content,
		mime: item.mime_type,
		size: item.content_size,
	};
}

async function renderNote(share: Share, note: NoteEntity, resourceInfos: ResourceInfos, linkedItemInfos: LinkedItemInfos): Promise<FileViewerResponse> {
	const markupToHtml = new MarkupToHtml({
		ResourceModel: Resource as OptionsResourceModel,
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
				return `${models_.share().shareUrl(share.owner_id, share.id)}?resource_id=${item.id}&t=${item.updated_time}`;
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

	const bodyHtml = await mustache_.renderView({
		cssFiles: ['items/note'],
		jsFiles: ['items/note'],
		name: 'note',
		title: 'Note',
		path: 'index/items/note',
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
					appBaseUrl: ${JSON.stringify(baseUrl_)},
				};
			`,
		},
	}, { prefersDarkEnabled: false });

	return {
		body: bodyHtml,
		mime: 'text/html',
		size: bodyHtml.length,
	};
}

export function itemIsEncrypted(item: Item): boolean {
	if ('jop_encryption_applied' in item) return !!item.jop_encryption_applied;
	if (!('content' in item)) throw new Error('Cannot check encryption - item is missing both "content" and "jop_encryption_applied" property');
	const header = item.content.toString('utf8', 0, 5);
	return isValidHeaderIdentifier(header);
}

export async function renderItem(userId: Uuid, item: Item, share: Share, query: Record<string, any>): Promise<FileViewerResponse> {
	const rootNote: NoteEntity = models_.item().itemToJoplinItem(item); // await this.unserializeItem(content);
	const linkedItemInfos: LinkedItemInfos = await noteLinkedItemInfos(userId, models_.item(), rootNote);
	const resourceInfos = await getResourceInfos(linkedItemInfos);

	const fileToRender = {
		item: item,
		content: null as any,
		itemId: rootNote.id,
	};

	if (query.resource_id) {
		const resourceItem = await models_.item().loadByName(userId, resourceBlobPath(query.resource_id), { fields: ['*'] });
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
		return renderResource(fileToRender.item, fileToRender.content);
	} else if (itemType === ModelType.Note) {
		return renderNote(share, itemToRender, resourceInfos, linkedItemInfos);
	} else {
		throw new Error(`Cannot render item with type "${itemType}"`);
	}
}
