import JoplinDatabase from '@joplin/lib/JoplinDatabase';
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
import { Item, Share, Uuid } from '../services/database/types';
import ItemModel from '../models/ItemModel';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { formatDateTime } from './time';
import { ErrorBadRequest, ErrorForbidden, ErrorNotFound } from './errors';
import { MarkupToHtml } from '@joplin/renderer';
import { OptionsResourceModel } from '@joplin/renderer/MarkupToHtml';
import { isValidHeaderIdentifier } from '@joplin/lib/services/e2ee/EncryptionService';
const { DatabaseDriverNode } = require('@joplin/lib/database-driver-node.js');
import { themeStyle } from '@joplin/lib/theme';
import Setting from '@joplin/lib/models/Setting';
import { Models } from '../models/factory';
import MustacheService from '../services/MustacheService';
import Logger from '@joplin/lib/Logger';
import config from '../config';
import { TreeItem } from '../models/ItemResourceModel';
const { substrWithEllipsis } = require('@joplin/lib/string-utils');

const logger = Logger.create('JoplinUtils');

export interface FileViewerResponse {
	body: any;
	mime: string;
	size: number;
	filename: string;
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

async function noteLinkedItemInfos(userId: Uuid, itemModel: ItemModel, noteBody: string): Promise<LinkedItemInfos> {
	const jopIds = await Note.linkedItemIds(noteBody);
	const output: LinkedItemInfos = {};

	for (const jopId of jopIds) {
		const item = await itemModel.loadByJopId(userId, jopId, { fields: ['*'], withContent: true });
		if (!item) continue;

		output[jopId] = {
			item: itemModel.itemToJoplinItem(item),
			file: null,
		};
	}

	return output;
}

async function renderResource(userId: string, resourceId: string, item: Item, content: Buffer): Promise<FileViewerResponse> {
	// The item passed to this function is the resource blob, which is
	// sufficient to download the resource. However, if we want a more user
	// friendly download, we need to know the resource original name and mime
	// type. So below, we try to get that information.
	let jopItem: any = null;

	try {
		const resourceItem = await models_.item().loadByJopId(userId, resourceId);
		jopItem = await models_.item().loadAsJoplinItem(resourceItem.id);
	} catch (error) {
		logger.error(`Could not load Joplin item ${resourceId} associated with item: ${item.id}`);
	}

	return {
		body: content,
		mime: jopItem ? jopItem.mime : item.mime_type,
		size: content ? content.byteLength : 0,
		filename: jopItem ? jopItem.title : '',
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
				return `${models_.share().shareUrl(share.owner_id, share.id)}?note_id=${item.id}&t=${item.updated_time}`;
			} else if (item.type_ === ModelType.Resource) {
				return `${models_.share().shareUrl(share.owner_id, share.id)}?resource_id=${item.id}&t=${item.updated_time}`;
			} else {
				// In theory, there can only be links to notes or resources. But
				// in practice nothing's stopping a plugin for example to create
				// a link to a folder. In this case, we don't want to throw an
				// exception as that would break rendering. Instead we just
				// disable the link.
				// https://github.com/laurent22/joplin/issues/6531
				logger.warn(`Unsupported type in share ${share.id}. Item: ${itemId}`);
				return '#';
			}
		},

		// Switch-off the media players because there's no option to toggle
		// them on and off.
		audioPlayerEnabled: false,
		videoPlayerEnabled: false,
		pdfViewerEnabled: false,
		checkboxDisabled: true,

		linkRenderingType: 2,
	};

	const result = await markupToHtml.render(note.markup_language, note.body, themeStyle(Setting.THEME_LIGHT), renderOptions);

	const bodyHtml = await mustache_.renderView({
		cssFiles: ['items/note'],
		jsFiles: ['items/note'],
		name: 'note',
		title: `${substrWithEllipsis(note.title, 0, 100)} - ${config().appName}`,
		titleOverride: true,
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
		size: Buffer.byteLength(bodyHtml, 'utf-8'),
		filename: '',
	};
}

export function itemIsEncrypted(item: Item): boolean {
	if ('jop_encryption_applied' in item) return !!item.jop_encryption_applied;
	if (!('content' in item)) throw new Error('Cannot check encryption - item is missing both "content" and "jop_encryption_applied" property');
	const header = item.content.toString('utf8', 0, 5);
	return isValidHeaderIdentifier(header);
}

const findParentNote = async (itemTree: TreeItem, resourceId: string) => {
	const find_ = (parentItem: TreeItem, currentTreeItems: TreeItem[], resourceId: string): TreeItem => {
		for (const it of currentTreeItems) {
			if (it.resource_id === resourceId) return parentItem;
			const child = find_(it, it.children, resourceId);
			if (child) return it;
		}
		return null;
	};

	const result = find_(itemTree, itemTree.children, resourceId);
	if (!result) throw new ErrorBadRequest(`Cannot find parent of ${resourceId}`);

	const item = await models_.item().loadWithContent(result.item_id);
	if (!item) throw new ErrorNotFound(`Cannot load item with ID ${result.item_id}`);

	return models_.item().itemToJoplinItem(item);
};

const isInTree = (itemTree: TreeItem, jopId: string) => {
	if (itemTree.resource_id === jopId) return true;
	for (const child of itemTree.children) {
		if (child.resource_id === jopId) return true;
		const found = isInTree(child, jopId);
		if (found) return true;
	}
	return false;
};

interface RenderItemQuery {
	resource_id?: string;
	note_id?: string;
}

// "item" is always the item associated with the share (the "root item"). It may
// be different from the item that will eventually get rendered - for example
// for resources or linked notes.
export async function renderItem(userId: Uuid, item: Item, share: Share, query: RenderItemQuery): Promise<FileViewerResponse> {
	interface FileToRender {
		item: Item;
		content: any;
		jopItemId: string;
	}

	const rootNote: NoteEntity = models_.item().itemToJoplinItem(item);
	const itemTree = await models_.itemResource().itemTree(item.id, rootNote.id);

	let linkedItemInfos: LinkedItemInfos = {};
	let resourceInfos: ResourceInfos = {};
	let fileToRender: FileToRender;
	let itemToRender: any = null;

	if (query.resource_id) {
		// ------------------------------------------------------------------------------------------
		// Render a resource that is attached to a note
		// ------------------------------------------------------------------------------------------

		const resourceItem = await models_.item().loadByName(userId, resourceBlobPath(query.resource_id), { fields: ['*'], withContent: true });
		if (!resourceItem) throw new ErrorNotFound(`No such resource: ${query.resource_id}`);

		fileToRender = {
			item: resourceItem,
			content: resourceItem.content,
			jopItemId: query.resource_id,
		};

		const parentNote = await findParentNote(itemTree, fileToRender.jopItemId);
		linkedItemInfos = await noteLinkedItemInfos(userId, models_.item(), parentNote.body);
		itemToRender = linkedItemInfos[fileToRender.jopItemId].item;
	} else if (query.note_id) {
		// ------------------------------------------------------------------------------------------
		// Render a linked note
		// ------------------------------------------------------------------------------------------


		if (!share.recursive) throw new ErrorForbidden('This linked note has not been published');

		const noteItem = await models_.item().loadByName(userId, `${query.note_id}.md`, { fields: ['*'], withContent: true });
		if (!noteItem) throw new ErrorNotFound(`No such note: ${query.note_id}`);

		fileToRender = {
			item: noteItem,
			content: noteItem.content,
			jopItemId: query.note_id,
		};

		linkedItemInfos = await noteLinkedItemInfos(userId, models_.item(), noteItem.content.toString());
		resourceInfos = await getResourceInfos(linkedItemInfos);
		itemToRender = models_.item().itemToJoplinItem(noteItem);
	} else {
		// ------------------------------------------------------------------------------------------
		// Render the root note
		// ------------------------------------------------------------------------------------------

		fileToRender = {
			item: item,
			content: null as any,
			jopItemId: rootNote.id,
		};

		linkedItemInfos = await noteLinkedItemInfos(userId, models_.item(), rootNote.body);
		resourceInfos = await getResourceInfos(linkedItemInfos);
		itemToRender = rootNote;
	}

	if (!itemToRender) throw new ErrorNotFound(`Cannot render item: ${item.id}: ${JSON.stringify(query)}`);

	// Verify that the item we're going to render is indeed part of the item
	// tree (i.e. it is either the root note, or one of the ancestor is the root
	// note). This is for security reason - otherwise it would be possible to
	// display any note by setting note_id to an arbitrary ID.
	if (!isInTree(itemTree, fileToRender.jopItemId)) {
		throw new ErrorNotFound(`Item "${fileToRender.jopItemId}" does not belong to this share`);
	}

	const itemType: ModelType = itemToRender.type_;

	if (itemType === ModelType.Resource) {
		return renderResource(userId, fileToRender.jopItemId, fileToRender.item, fileToRender.content);
	} else if (itemType === ModelType.Note) {
		return renderNote(share, itemToRender, resourceInfos, linkedItemInfos);
	} else {
		throw new Error(`Cannot render item with type "${itemType}"`);
	}
}
