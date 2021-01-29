import JoplinDatabase from '@joplin/lib/JoplinDatabase';
import Logger from '@joplin/lib/Logger';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';
import { File, Share, Uuid } from '../../db';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { MarkupToHtml } from '@joplin/renderer';
import Setting from '@joplin/lib/models/Setting';
import Resource from '@joplin/lib/models/Resource';
import FileModel from '../../models/FileModel';
import { ErrorNotFound } from '../../utils/errors';
import BaseApplication from '../../services/BaseApplication';
import { formatDateTime } from '../../utils/time';
const { DatabaseDriverNode } = require('@joplin/lib/database-driver-node.js');
const { themeStyle } = require('@joplin/lib/theme');

const logger = Logger.create('JoplinApp');

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

	// Although we don't use the database to store data, we still need to setup
	// so that its schema can be accessed. This is needed for example by
	// Note.unserialize to know what fields are valid for a note, and to format
	// the field values correctly.
	private db_: JoplinDatabase;

	private pluginAssetRootDir_: string;

	public async initialize() {
		this.mustache.prefersDarkEnabled = false;
		this.pluginAssetRootDir_ = require('path').resolve(__dirname, '../../..', 'node_modules/@joplin/renderer/assets');

		const filePath = `${this.config.tempDir}/joplin.sqlite`;

		this.db_ = new JoplinDatabase(new DatabaseDriverNode());
		this.db_.setLogger(logger as Logger);
		await this.db_.open({ name: filePath });

		BaseModel.setDb(this.db_);

		// Only load the classes that will be needed to render the notes and
		// resources.
		BaseItem.loadClass('Note', Note);
		BaseItem.loadClass('Resource', Resource);
	}

	public async localFileFromUrl(url: string): Promise<string> {
		const pluginAssetPrefix = 'apps/joplin/pluginAssets/';

		if (url.indexOf(pluginAssetPrefix) === 0) {
			return `${this.pluginAssetRootDir_}/${url.substr(pluginAssetPrefix.length)}`;
		}

		return null;
	}

	private itemIdFilename(itemId: string): string {
		return `${itemId}.md`;
	}

	private async itemMetadataFile(parentId: Uuid, itemId: string): Promise<File> {
		const file = await this.models.file().fileByName(parentId, this.itemIdFilename(itemId), { skipPermissionCheck: true });
		return this.models.file().loadWithContent(file.id, { skipPermissionCheck: true });
	}

	private async unserializeItem(file: File): Promise<any> {
		const content = file.content.toString();
		return BaseItem.unserialize(content);
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

	private async noteLinkedItemInfos(noteFileParentId: string, note: NoteEntity): Promise<LinkedItemInfos> {
		const itemIds = await Note.linkedItemIds(note.body);
		const output: LinkedItemInfos = {};

		for (const itemId of itemIds) {
			const itemFile = await this.itemMetadataFile(noteFileParentId, itemId);
			output[itemId] = {
				item: await this.unserializeItem(itemFile),
				file: itemFile,
			};
		}

		return output;
	}

	private async resourceDir(fileModel: FileModel, parentId: Uuid): Promise<File> {
		const parent = await fileModel.load(parentId);
		const parentFullPath = await fileModel.itemFullPath(parent);
		const dirPath = fileModel.resolve(parentFullPath, '.resource');
		return fileModel.pathToFile(dirPath);
	}

	private async itemFile(fileModel: FileModel, parentId: Uuid, itemType: ModelType, itemId: string): Promise<File> {
		let output: File = null;

		if (itemType === ModelType.Resource) {
			const resourceDir = await this.resourceDir(fileModel, parentId);
			output = await fileModel.fileByName(resourceDir.id, itemId);
		} else if (itemType === ModelType.Note) {
			output = await fileModel.fileByName(parentId, this.itemIdFilename(itemId));
		} else {
			throw new Error(`Unsupported type: ${itemType}`);
		}

		return fileModel.loadWithContent(output.id);
	}

	private async renderResource(file: File): Promise<FileViewerResponse> {
		return {
			body: file.content,
			mime: file.mime_type,
			size: file.size,
		};
	}

	private async renderNote(share: Share, note: NoteEntity, resourceInfos: ResourceInfos, linkedItemInfos: LinkedItemInfos): Promise<FileViewerResponse> {
		const markupToHtml = new MarkupToHtml({
			ResourceModel: Resource,
		});

		const renderOptions: any = {
			resources: resourceInfos,

			itemIdToUrl: (itemId: Uuid) => {
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

	public async renderFile(file: File, share: Share, query: Record<string, any>): Promise<FileViewerResponse> {
		const fileModel = this.models.file({ userId: file.owner_id });

		const rootNote: NoteEntity = await this.unserializeItem(file);
		const linkedItemInfos = await this.noteLinkedItemInfos(file.parent_id, rootNote);
		const resourceInfos = await this.resourceInfos(linkedItemInfos);

		const fileToRender = {
			file: file,
			itemId: rootNote.id,
		};

		if (query.resource_id) {
			fileToRender.file = await this.itemFile(fileModel, file.parent_id, ModelType.Resource, query.resource_id);
			fileToRender.itemId = query.resource_id;
		}

		// No longer supported - need to decide what to do about note links.

		// if (query.note_id) {
		// 	fileToRender.file = await this.itemFile(fileModel, file.parent_id, ModelType.Note, query.note_id);
		// 	fileToRender.itemId = query.note_id;
		// }

		if (fileToRender.file !== file && !linkedItemInfos[fileToRender.itemId]) {
			throw new ErrorNotFound(`Item "${fileToRender.itemId}" does not belong to this note`);
		}

		const itemToRender = fileToRender.file === file ? rootNote : linkedItemInfos[fileToRender.itemId].item;
		const itemType: ModelType = itemToRender.type_;

		if (itemType === ModelType.Resource) {
			return this.renderResource(fileToRender.file);
		} else if (itemType === ModelType.Note) {
			return this.renderNote(share, itemToRender, resourceInfos, linkedItemInfos);
		} else {
			throw new Error(`Cannot render item with type "${itemType}"`);
		}
	}

	public async isItemFile(file: File): Promise<boolean> {
		if (file.mime_type !== 'text/markdown') return false;

		try {
			await this.unserializeItem(file);
		} catch (error) {
			// No need to log - it means it's not a note file
			return false;
		}

		return true;
	}

}
