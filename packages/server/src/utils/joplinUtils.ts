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
import { itemIsInTrash } from '@joplin/lib/services/trash';
import { formatDateTime } from './time';
import { ErrorBadRequest, ErrorForbidden, ErrorNotFound } from './errors';
import { MarkupToHtml } from '@joplin/renderer';
import { OptionsResourceModel } from '@joplin/renderer/types';
import { isValidHeaderIdentifier } from '@joplin/lib/services/e2ee/EncryptionService';
import { DatabaseDriverNode } from '@joplin/lib/database-driver-node';
import { themeStyle } from '@joplin/lib/theme';
import Setting from '@joplin/lib/models/Setting';
import { Models } from '../models/factory';
import MustacheService from '../services/MustacheService';
import Logger from '@joplin/utils/Logger';
import config from '../config';
import { TreeItem } from '../models/ItemResourceModel';
import resolvePathWithinDir from '@joplin/lib/utils/resolvePathWithinDir';
import { loadKeychainServiceAndSettings } from '@joplin/lib/services/SettingUtils';
import KeychainServiceDriverDummy from '@joplin/lib/services/keychain/KeychainServiceDriver.dummy';
import BaseService from '@joplin/lib/services/BaseService';
import { substrWithEllipsis } from '@joplin/lib/string-utils';
import FsDriverNode from '@joplin/lib/fs-driver-node';
import { sanitizeUserUrl } from './urlUtils';
import { BannerInfo } from './banners';
import { getDefaultBannerInfo } from './banners';

const logger = Logger.create('JoplinUtils');

export interface FileViewerResponse {
	body: Buffer | string;
	mime: string;
	size: number;
	filename: string;
}

interface ResourceInfo {
	localState: { fetch_status: number };
	item: NoteEntity;
}

interface LinkedItemInfo {
	item: NoteEntity;
	file: File;
}

interface RenderedFolderTree {
	rootTitle: string;
	treeDataJson: string;
	allowedNoteIds: Set<string>;
}

interface TreeSourceNode {
	title: string;
	key: string;
	url?: string;
	folder?: boolean;
	expanded?: boolean;
	children?: TreeSourceNode[];
}

interface RenderedNote {
	title: string;
	updatedDateTime: string;
	bodyHtml: string;
}

interface RenderItemQuery {
	resource_id?: string;
	note_id?: string;
}

interface RenderNotePageOptions {
	emptyStateErrorMessage?: string;
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

	const fsDriver = new FsDriverNode();
	Resource.fsDriver_ = fsDriver;

	BaseService.logger_ = new Logger();

	Setting.allowFileStorage = false;
	Setting.setConstant('appId', 'net.cozic.joplin-desktop');
	Setting.setConstant('tempDir', config.tempDir);
	Setting.setConstant('resourceDir', config.resourceDir);
	await loadKeychainServiceAndSettings([KeychainServiceDriverDummy]);

}

export function linkedResourceIds(body: string): string[] {
	return Note.linkedItemIds(body);
}

export function isJoplinItemName(name: string): boolean {
	return !!name.match(/^[0-9a-zA-Z]{32}\.md$/);
}

export async function unserializeJoplinItem(body: string): Promise<NoteEntity> {
	return BaseItem.unserialize(body);
}

export async function serializeJoplinItem(item: NoteEntity): Promise<string> {
	const ModelClass = BaseItem.itemClass(item);
	return ModelClass.serialize(item);
}

export function resourceBlobPath(resourceId: string): string {
	return `${resourceDirName}/${resourceId}`;
}

export function isJoplinResourceBlobPath(path: string): boolean {
	return path.indexOf(resourceDirName) === 0;
}

const resolveUnsafeAssetPath = (relativeAssetPath: string) => {
	const resolvedPath = resolvePathWithinDir(pluginAssetRootDir_, relativeAssetPath);
	if (resolvedPath === null) {
		throw new ErrorForbidden('Disallowed access: Item is not in the plugin asset directory');
	}
	return resolvedPath;
};

export async function localFileFromUrl(urlPath: string): Promise<string> {
	const cssPluginAssets = 'css/pluginAssets/';
	const jsPluginAssets = 'js/pluginAssets/';
	const baseUrls = [cssPluginAssets, jsPluginAssets];

	for (const baseUrl of baseUrls) {
		if (urlPath.startsWith(baseUrl)) {
			const pluginAssetPath = urlPath.substring(baseUrl.length);
			return resolveUnsafeAssetPath(pluginAssetPath);
		}
	}

	return null;
}

async function getResourceInfos(linkedItemInfos: LinkedItemInfos): Promise<ResourceInfos> {
	const output: ResourceInfos = {};

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

export async function noteLinkedItemInfos(userId: Uuid, itemModel: ItemModel, noteBody: string): Promise<LinkedItemInfos> {
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
	let jopItem: NoteEntity & { mime?: string } | null = null;

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

async function renderNote(
	share: Share,
	note: NoteEntity,
	resourceInfos: ResourceInfos,
	linkedItemInfos: LinkedItemInfos,
	bannerInfo: BannerInfo,
	folderTree: RenderedFolderTree = null,
): Promise<FileViewerResponse> {
	const markupToHtml = new MarkupToHtml({
		ResourceModel: Resource as OptionsResourceModel,
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- markupToHtml.render's RenderOptions is loosely typed in @joplin/renderer; tightening would require updating the renderer package
	const renderOptions: any = {
		resources: resourceInfos,

		itemIdToUrl: (itemId: Uuid) => {
			if (!linkedItemInfos[itemId]) return '#';

			const item = linkedItemInfos[itemId].item;
			if (!item) throw new Error(`No such item in this note: ${itemId}`);

			if (item.type_ === ModelType.Note) {
				return `${models_.share().shareUrl(share.owner_id, share.id)}?note_id=${item.id}&t=${item.updated_time}`;
			} else if (item.type_ === ModelType.Resource) {
				const query: Record<string, string|number> = { resource_id: item.id, t: item.updated_time };
				if (folderTree) query.note_id = note.id;
				return models_.share().shareUrl(share.owner_id, share.id, query);
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

		// KaTeX defaults to strict:'warn' and dumps to console.warn on any
		// LaTeX-incompatible input (commonly U+00A0 from email/Word pastes).
		// Shared-note viewers see the same output either way; silence the
		// server logs.
		plugins: {
			katex: { strict: 'ignore' },
		},
	};

	try {
		const result = await markupToHtml.render(note.markup_language, note.body, themeStyle(Setting.THEME_LIGHT), renderOptions);

		return renderNotePage(
			note.title,
			bannerInfo,
			{
				title: note.title,
				bodyHtml: result.html,
				updatedDateTime: formatDateTime(note.user_updated_time),
			},
			folderTree,
			result.cssStrings,
			result.pluginAssets,
		);

	} catch (error) {
		// Resolves: https://github.com/laurent22/joplin/issues/13059
		error.message = `Could not render note - please make sure it has been synchronised. Error was: ${error.message}`;
		throw error;
	}
}

async function buildFolderTree(share: Share, folderId: string, activeNoteId = ''): Promise<RenderedFolderTree> {
	const rootFolderItem = await models_.item().loadByJopId(share.owner_id, folderId, { fields: ['*'], withContent: true });
	if (!rootFolderItem) throw new ErrorNotFound(`No such folder: ${folderId}`);

	const rootFolder = models_.item().itemToJoplinItem(rootFolderItem);
	if (itemIsInTrash(rootFolder)) throw new ErrorNotFound(`No such folder: ${folderId}`);

	const allowedNoteIds = new Set<string>();

	const buildNodes = async (parentId: string): Promise<TreeSourceNode[]> => {
		const children = await models_.item().loadByJopParentId(share.owner_id, parentId, { fields: ['*'], withContent: true });
		const output: TreeSourceNode[] = [];

		for (const child of children) {
			const childJopItem = models_.item().itemToJoplinItem(child);
			if (itemIsInTrash(childJopItem)) continue;

			if (child.jop_type === ModelType.Folder) {
				output.push({
					title: childJopItem.title || '',
					key: childJopItem.id,
					folder: true,
					expanded: true,
					children: await buildNodes(childJopItem.id),
				});
			} else if (child.jop_type === ModelType.Note) {
				allowedNoteIds.add(childJopItem.id);
				output.push({
					title: childJopItem.title || '',
					key: childJopItem.id,
					url: models_.share().shareUrl(share.owner_id, share.id, { note_id: childJopItem.id, t: childJopItem.updated_time }),
				});
			}
		}

		return output;
	};

	const source = await buildNodes(rootFolder.id);
	const activeKey = activeNoteId && allowedNoteIds.has(activeNoteId) ? activeNoteId : '';

	return {
		rootTitle: rootFolder.title || '',
		treeDataJson: JSON.stringify({ activeKey, source }),
		allowedNoteIds,
	};
}


async function renderNotePage(
	title: string,
	banner: BannerInfo,
	note: RenderedNote = null,
	folderTree: RenderedFolderTree = null,
	cssStrings: string[] = [],
	pluginAssets: unknown[] = [],
	options: RenderNotePageOptions = {},
): Promise<FileViewerResponse> {

	const outputCssStrings = cssStrings.slice();
	const bodyHtml = await mustache_.renderView({
		cssFiles: folderTree ? ['items/note', 'wunderbaum'] : ['items/note'],
		jsFiles: folderTree ? ['items/note', 'wunderbaum.umd.min', 'items/folderTree'] : ['items/note'],
		name: 'note',
		title: `${substrWithEllipsis(title, 0, 100)} - ${config().appName}`,
		titleOverride: true,
		path: 'index/items/note',
		content: {
			showFolderTree: !!folderTree,
			folderTree,
			note,
			emptyStateHtml: '',
			emptyStateErrorMessage: options.emptyStateErrorMessage || '',
			logoSrc: banner.logoDataUrl ? banner.logoDataUrl : `${baseUrl_}/images/JoplinLogo.png`,
			logoTitle: banner.logo_title,

			// We sanitize the URL so that the user can't inject JavaScript with javascript: URLs.
			// Although we *now* also validate this when the BannerModel is updated, some users may have
			// old, invalid URLs.
			logoUrl: sanitizeUserUrl(banner.logo_url),
			cssStrings: outputCssStrings.join('\n'),
			assetsJs: `
				const joplinNoteViewer = {
					pluginAssets: ${JSON.stringify(pluginAssets)},
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

// "item" is always the item associated with the share (the "root item"). It may
// be different from the item that will eventually get rendered - for example
// for resources or linked notes.
export async function renderItem(userId: Uuid, item: Item, share: Share, query: RenderItemQuery): Promise<FileViewerResponse> {
	const bannerInfo = getDefaultBannerInfo();

	if (item.jop_type === ModelType.Folder) {
		const folderTree = await buildFolderTree(share, item.jop_id, query.note_id || '');

		if (!query.note_id) {
			if (query.resource_id) {
				throw new ErrorNotFound(`Resource "${query.resource_id}" does not belong to this share`);
			}

			return renderNotePage(folderTree.rootTitle, bannerInfo, null, folderTree);
		}

		if (!folderTree.allowedNoteIds.has(query.note_id)) {
			if (query.resource_id) throw new ErrorNotFound(`Resource "${query.resource_id}" does not belong to this share`);

			return renderNotePage(
				folderTree.rootTitle,
				bannerInfo,
				null,
				folderTree,
				[],
				[],
				{
					emptyStateErrorMessage: `Item "${query.note_id}" does not belong to this share`,
				},
			);
		}

		const noteItem = await models_.item().loadByName(userId, `${query.note_id}.md`, { fields: ['*'], withContent: true });
		if (!noteItem) throw new ErrorNotFound(`No such note: ${query.note_id}`);
		const note = models_.item().itemToJoplinItem(noteItem);
		if (itemIsInTrash(note)) throw new ErrorNotFound(`No such note: ${query.note_id}`);

		const linkedItemInfos = await noteLinkedItemInfos(userId, models_.item(), note.body);

		if (query.resource_id) {
			const linkedItemInfo = linkedItemInfos[query.resource_id];
			if (!linkedItemInfo || linkedItemInfo.item.type_ !== ModelType.Resource) {
				throw new ErrorNotFound(`Resource "${query.resource_id}" does not belong to this share`);
			}

			const resourceItem = await models_.item().loadByName(userId, resourceBlobPath(query.resource_id), { fields: ['*'], withContent: true });
			if (!resourceItem) throw new ErrorNotFound(`No such resource: ${query.resource_id}`);
			return renderResource(userId, query.resource_id, resourceItem, resourceItem.content);
		}

		const resourceInfos = await getResourceInfos(linkedItemInfos);
		return renderNote(share, note, resourceInfos, linkedItemInfos, bannerInfo, folderTree);
	}

	interface FileToRender {
		item: Item;
		content: Buffer | null;
		jopItemId: string;
	}

	const rootNote: NoteEntity = models_.item().itemToJoplinItem(item);
	if (itemIsInTrash(rootNote)) throw new ErrorNotFound(`No such note: ${rootNote.id}`);

	const itemTree = await models_.itemResource().itemTree(item.id, rootNote.id);

	let linkedItemInfos: LinkedItemInfos = {};
	let resourceInfos: ResourceInfos = {};
	let fileToRender: FileToRender;
	let itemToRender: NoteEntity & { type_?: ModelType } | null = null;

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

		itemToRender = models_.item().itemToJoplinItem(noteItem);
		linkedItemInfos = await noteLinkedItemInfos(userId, models_.item(), itemToRender.body);
		resourceInfos = await getResourceInfos(linkedItemInfos);
	} else {
		// ------------------------------------------------------------------------------------------
		// Render the root note
		// ------------------------------------------------------------------------------------------

		fileToRender = {
			item: item,
			content: null,
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
		return renderNote(share, itemToRender, resourceInfos, linkedItemInfos, bannerInfo);
	} else {
		throw new Error(`Cannot render item with type "${itemType}"`);
	}
}
