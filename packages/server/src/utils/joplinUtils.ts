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
import { createHash } from 'crypto';
import { Item, Share, Uuid } from '../services/database/types';
import ItemModel from '../models/ItemModel';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { itemIsInTrash } from '@joplin/lib/services/trash';
import { formatDateTime } from './time';
import { ErrorForbidden, ErrorNotFound } from './errors';
import { MarkupToHtml } from '@joplin/renderer';
import { OptionsResourceModel, RenderResult } from '@joplin/renderer/types';
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
	return path.indexOf(`${resourceDirName}/`) === 0;
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

interface CachedRenderedNote {
	result: RenderResult;
	length: number;
}

// Anyone can publish a note that is slow to render, and it can then be requested anonymously in a loop, so the rendered
// markup is cached by everything it depends on. Size-limited the same way as the folder tree cache.
const renderedNoteCache = new Map<string, CachedRenderedNote>();
let renderedNoteCacheLength = 0;
const maxRenderedNoteCacheLength = 50_000_000;
const maxCachedRenderedNotes = 10000;
const maxCachedRenderedNoteLength = 5_000_000;

const getCachedRenderedNote = (key: string) => {
	const cached = renderedNoteCache.get(key);
	if (!cached) return null;
	renderedNoteCache.delete(key);
	renderedNoteCache.set(key, cached);
	return cached.result;
};

const cacheRenderedNote = (key: string, result: RenderResult) => {
	const length = result.html.length + result.cssStrings.join('').length + JSON.stringify(result.pluginAssets).length;
	if (length > maxCachedRenderedNoteLength) return;

	const previous = renderedNoteCache.get(key);
	if (previous) {
		renderedNoteCache.delete(key);
		renderedNoteCacheLength -= previous.length;
	}
	renderedNoteCache.set(key, { result, length });
	renderedNoteCacheLength += length;

	for (const [oldestKey, oldest] of renderedNoteCache) {
		if (renderedNoteCacheLength <= maxRenderedNoteCacheLength && renderedNoteCache.size <= maxCachedRenderedNotes) break;
		renderedNoteCache.delete(oldestKey);
		renderedNoteCacheLength -= oldest.length;
	}
};

async function renderNote(
	share: Share,
	note: NoteEntity,
	resourceInfos: ResourceInfos,
	linkedItemInfos: LinkedItemInfos,
	bannerInfo: BannerInfo,
	folderTree: RenderedFolderTree = null,
): Promise<FileViewerResponse> {
	if (note.is_locked) throw new ErrorForbidden('The note cannot be displayed because it is locked');

	const markupToHtml = new MarkupToHtml({
		ResourceModel: Resource as OptionsResourceModel,
		// Off by default in the apps, and its smart quotes are slow to render on some inputs
		pluginOptions: { typographer: { enabled: false } },
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- markupToHtml.render's RenderOptions is loosely typed in @joplin/renderer; tightening would require updating the renderer package
	const renderOptions: any = {
		// Not used by the renderer, but part of the key of its own cache, which would otherwise return the HTML of a note
		// rendered for another share, with links to that share
		shareId: share.id,

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
		const linkedItems = Object.values(linkedItemInfos).map(info => info.item);
		const cacheKey = createHash('sha256').update(JSON.stringify([share.id, !!folderTree, note.id, note.markup_language, note.body, linkedItems])).digest('hex');

		let result = getCachedRenderedNote(cacheKey);
		if (!result) {
			result = await markupToHtml.render(note.markup_language, note.body, themeStyle(Setting.THEME_LIGHT), renderOptions);
			cacheRenderedNote(cacheKey, result);
		}

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

interface FolderTreeMetadata {
	item: Item;
	children: FolderTreeMetadata[];
}

interface FolderTreeItemInfo {
	updatedTime: number;
	title: string;
	inTrash: boolean;
	jopUpdatedTime: number;
}

interface FolderTreeRefreshResult {
	tree?: CachedFolderTree;
	error?: Error;
}

interface CachedFolderTree {
	fingerprint: string;
	checkedTime: number;
	rootTitle: string;
	sourceJson: string;
	allowedNoteIds: Set<string>;
}

// A published notebook's titles are only in its items' contents, which can add up to gigabytes, and the tree is needed
// by every anonymous request for the page and each of its images. So it is built once, and rebuilt only when one of its
// items has changed, loading only the items that changed, one at a time. An account can publish more notebooks than fit
// in the cache, so only a few are refreshed at a time.
const folderTreeCache = new Map<string, CachedFolderTree>();
let folderTreeCacheLength = 0;
const folderTreeItemInfos = new Map<Uuid, FolderTreeItemInfo>();
const folderTreeRefreshes = new Map<string, Promise<FolderTreeRefreshResult>>();
const runningFolderTreeRefreshesByOwner = new Map<Uuid, number>();
let runningFolderTreeRefreshes = 0;
const waitingFolderTreeRefreshes: { ownerId: Uuid; start: ()=> void }[] = [];
const maxFolderTreeCacheLength = 50_000_000;
const maxCachedFolderTrees = 1000;
const maxCachedFolderTreeItemInfos = 100_000;
const maxRunningFolderTreeRefreshes = 4;
const maxRunningFolderTreeRefreshesPerOwner = 1;
const maxFolderTreeStaleness = 60 * 1000;
const maxFolderTreeTitleLength = 200;
const folderTreeCheckInterval = 10 * 1000;
const maxFolderTreeItems = 10000;

const loadFolderTreeMetadata = async (ownerId: Uuid, rootFolderItem: Item) => {
	const visitedFolderIds = new Set([rootFolderItem.jop_id]);
	let itemCount = 0;

	const loadChildren = async (parentId: string): Promise<FolderTreeMetadata[]> => {
		const children = await models_.item().loadByJopParentId(ownerId, parentId, { fields: ['id', 'jop_id', 'jop_type', 'jop_share_id', 'updated_time'] });
		const output: FolderTreeMetadata[] = [];

		for (const child of children) {
			if (child.jop_type !== ModelType.Folder && child.jop_type !== ModelType.Note) continue;
			// The parent id is set by whoever uploads the item, so someone sharing another notebook with the publisher
			// could otherwise add items to the published notebook
			if ((child.jop_share_id || '') !== (rootFolderItem.jop_share_id || '')) continue;
			if (itemCount >= maxFolderTreeItems) break;
			itemCount++;

			// Folders can be made to be each other's parent
			if (child.jop_type === ModelType.Folder) {
				if (visitedFolderIds.has(child.jop_id)) continue;
				visitedFolderIds.add(child.jop_id);
			}

			output.push({
				item: child,
				children: child.jop_type === ModelType.Folder ? await loadChildren(child.jop_id) : [],
			});
		}

		return output;
	};

	return loadChildren(rootFolderItem.jop_id);
};

const folderTreeFingerprint = (rootFolderItem: Item, nodes: FolderTreeMetadata[]) => {
	const hash = createHash('sha256');
	const add = (item: Item) => hash.update(`${item.id}:${item.updated_time}\n`);
	add(rootFolderItem);

	// Folders can be nested deeper than the call stack allows
	const stack = nodes.slice().reverse();
	while (stack.length) {
		const node = stack.pop();
		add(node.item);
		for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
	}

	return hash.digest('hex');
};

const loadFolderTreeItemInfo = async (item: Item) => {
	let info = folderTreeItemInfos.get(item.id);

	if (!info || info.updatedTime !== item.updated_time) {
		// It may have been deleted since the tree metadata was loaded
		const itemWithContent = await models_.item().loadWithContent(item.id);
		if (!itemWithContent) return null;

		const jopItem = models_.item().itemToJoplinItem(itemWithContent);
		info = {
			updatedTime: itemWithContent.updated_time,
			title: substrWithEllipsis(jopItem.title || '', 0, maxFolderTreeTitleLength),
			inTrash: itemIsInTrash(jopItem),
			jopUpdatedTime: jopItem.updated_time,
		};
	}

	folderTreeItemInfos.delete(item.id);
	folderTreeItemInfos.set(item.id, info);
	for (const oldestItemId of folderTreeItemInfos.keys()) {
		if (folderTreeItemInfos.size <= maxCachedFolderTreeItemInfos) break;
		folderTreeItemInfos.delete(oldestItemId);
	}

	return info;
};

const buildCachedFolderTree = async (share: Share, rootFolderItem: Item, nodes: FolderTreeMetadata[], fingerprint: string, checkedTime: number): Promise<CachedFolderTree> => {
	const rootInfo = await loadFolderTreeItemInfo(rootFolderItem);
	if (!rootInfo || rootInfo.inTrash) throw new ErrorNotFound(`No such folder: ${rootFolderItem.jop_id}`);

	const allowedNoteIds = new Set<string>();

	const buildNodes = async (nodes: FolderTreeMetadata[]): Promise<TreeSourceNode[]> => {
		const output: TreeSourceNode[] = [];

		for (const node of nodes) {
			const info = await loadFolderTreeItemInfo(node.item);
			if (!info || info.inTrash) continue;

			if (node.item.jop_type === ModelType.Folder) {
				output.push({
					title: info.title,
					key: node.item.jop_id,
					folder: true,
					expanded: true,
					children: await buildNodes(node.children),
				});
			} else {
				allowedNoteIds.add(node.item.jop_id);
				output.push({
					title: info.title,
					key: node.item.jop_id,
					url: models_.share().shareUrl(share.owner_id, share.id, { note_id: node.item.jop_id, t: info.jopUpdatedTime }),
				});
			}
		}

		return output;
	};

	return {
		fingerprint,
		checkedTime,
		rootTitle: rootInfo.title,
		sourceJson: JSON.stringify(await buildNodes(nodes)),
		allowedNoteIds,
	};
};

const refreshFolderTree = async (share: Share, folderId: string, tree: CachedFolderTree | undefined) => {
	// Changes made during the refresh are picked up by the next one
	const checkedTime = Date.now();

	const rootFolderItem = await models_.item().loadByJopId(share.owner_id, folderId, { fields: ['id', 'jop_id', 'jop_share_id', 'updated_time'] });
	if (!rootFolderItem) throw new ErrorNotFound(`No such folder: ${folderId}`);

	const nodes = await loadFolderTreeMetadata(share.owner_id, rootFolderItem);
	const fingerprint = folderTreeFingerprint(rootFolderItem, nodes);

	if (tree && tree.fingerprint === fingerprint) return { ...tree, checkedTime };
	return buildCachedFolderTree(share, rootFolderItem, nodes, fingerprint, checkedTime);
};

const canStartFolderTreeRefresh = (ownerId: Uuid) => {
	return runningFolderTreeRefreshes < maxRunningFolderTreeRefreshes && (runningFolderTreeRefreshesByOwner.get(ownerId) || 0) < maxRunningFolderTreeRefreshesPerOwner;
};

const changeRunningFolderTreeRefreshes = (ownerId: Uuid, change: number) => {
	runningFolderTreeRefreshes += change;
	const ownerCount = (runningFolderTreeRefreshesByOwner.get(ownerId) || 0) + change;
	if (ownerCount) {
		runningFolderTreeRefreshesByOwner.set(ownerId, ownerCount);
	} else {
		runningFolderTreeRefreshesByOwner.delete(ownerId);
	}
};

// Only a few refreshes run at a time, and only one per owner, so that one account with many large or deeply nested
// published notebooks cannot hold up those of everyone else
export const withFolderTreeRefreshSlot = async <T>(ownerId: Uuid, refresh: ()=> Promise<T>) => {
	if (canStartFolderTreeRefresh(ownerId)) {
		changeRunningFolderTreeRefreshes(ownerId, 1);
	} else {
		await new Promise<void>(resolve => {
			waitingFolderTreeRefreshes.push({ ownerId, start: resolve });
		});
	}

	try {
		return await refresh();
	} finally {
		changeRunningFolderTreeRefreshes(ownerId, -1);

		for (let i = 0; i < waitingFolderTreeRefreshes.length; i++) {
			const waiting = waitingFolderTreeRefreshes[i];
			if (!canStartFolderTreeRefresh(waiting.ownerId)) continue;
			waitingFolderTreeRefreshes.splice(i, 1);
			i--;
			changeRunningFolderTreeRefreshes(waiting.ownerId, 1);
			waiting.start();
		}
	}
};

const cacheFolderTree = (shareId: string, tree: CachedFolderTree) => {
	const previous = folderTreeCache.get(shareId);
	if (previous) {
		folderTreeCache.delete(shareId);
		folderTreeCacheLength -= previous.sourceJson.length;
	}
	folderTreeCache.set(shareId, tree);
	folderTreeCacheLength += tree.sourceJson.length;

	for (const [oldestShareId, oldestTree] of folderTreeCache) {
		const isFull = folderTreeCacheLength > maxFolderTreeCacheLength || folderTreeCache.size > maxCachedFolderTrees;
		if (!isFull || oldestShareId === shareId) break;
		folderTreeCache.delete(oldestShareId);
		folderTreeCacheLength -= oldestTree.sourceJson.length;
	}
};

// Never rejects, so that a refresh that nobody waits for does not leave an unhandled rejection
const startFolderTreeRefresh = (share: Share, folderId: string, previousTree: CachedFolderTree | undefined) => {
	let refresh = folderTreeRefreshes.get(share.id);
	if (refresh) return refresh;

	refresh = (async () => {
		try {
			const tree = await withFolderTreeRefreshSlot(share.owner_id, () => refreshFolderTree(share, folderId, previousTree));
			cacheFolderTree(share.id, tree);
			return { tree };
		} catch (error) {
			return { error };
		} finally {
			folderTreeRefreshes.delete(share.id);
		}
	})();
	folderTreeRefreshes.set(share.id, refresh);
	return refresh;
};

async function buildFolderTree(share: Share, folderId: string, activeNoteId = ''): Promise<RenderedFolderTree> {
	let tree = folderTreeCache.get(share.id);

	if (!tree || Date.now() - tree.checkedTime > folderTreeCheckInterval) {
		const refresh = startFolderTreeRefresh(share, folderId, tree);

		// A cached tree is served while it is refreshed, unless it is old enough that serving it would keep showing
		// notes that are no longer published
		if (!tree || Date.now() - tree.checkedTime > maxFolderTreeStaleness) {
			const result = await refresh;
			if (result.error) throw result.error;
			tree = result.tree;
		}
	}

	cacheFolderTree(share.id, tree);

	const activeKey = activeNoteId && tree.allowedNoteIds.has(activeNoteId) ? activeNoteId : '';

	return {
		rootTitle: tree.rootTitle,
		treeDataJson: `{"activeKey":${JSON.stringify(activeKey)},"source":${tree.sourceJson}}`,
		allowedNoteIds: tree.allowedNoteIds,
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
		showFooter: false,
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
	if (!result) throw new ErrorNotFound(`Resource "${resourceId}" does not belong to this share`);

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
		// Checked before building the tree, which would otherwise be walked on every request only to be refused
		if (itemIsInTrash(models_.item().itemToJoplinItem(item))) throw new ErrorNotFound(`No such folder: ${item.jop_id}`);

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

	const itemTree = await models_.itemResource().itemTree(userId, item.id, rootNote.id);

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
