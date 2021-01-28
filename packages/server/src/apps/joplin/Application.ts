import JoplinDatabase from '@joplin/lib/JoplinDatabase';
import Logger from '@joplin/lib/Logger';
import BaseModel, { ModelType } from '@joplin/lib/BaseModel';
import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';
import { File, Share, Uuid } from '../../db';
import { NoteEntity, ResourceEntity } from '@joplin/lib/services/database/types';
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

export default class Application extends BaseApplication {

	// Although we don't use the database to store data, we still need to setup
	// so that its schema can be accessed. This is needed for example by
	// Note.unserialize to know what fields are valid for a note, and to format
	// the field values correctly.
	private db_: JoplinDatabase;

	public async initialize() {
		this.mustache.prefersDarkEnabled = false;

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

	private idToFilename(itemId: string): string {
		return `${itemId}.md`;
	}

	private async resourceMetadataFile(parentId: Uuid, resourceId: string): Promise<File> {
		const file = await this.models.file().fileByName(parentId, this.idToFilename(resourceId), { skipPermissionCheck: true });
		return this.models.file().loadWithContent(file.id, { skipPermissionCheck: true });
	}

	private async unserializeItem(type: ModelType, file: File): Promise<any> {
		const content = file.content.toString();

		if (type === ModelType.Note) {
			return Note.unserialize(content);
		} else if (type === ModelType.Resource) {
			return Resource.unserialize(content);
		}

		throw new Error(`Unsupported type: ${type}`);
	}

	private async noteResourceInfos(noteFileParentId: string, note: NoteEntity): Promise<Record<string, any>> {
		const resourceIds = await Note.linkedItemIds(note.body);
		const output: Record<string, any> = {};

		for (const resourceId of resourceIds) {
			const resourceFile = await this.resourceMetadataFile(noteFileParentId, resourceId);
			const resource: ResourceEntity = await this.unserializeItem(ModelType.Resource, resourceFile);

			output[resource.id] = {
				item: resource,
				localState: {
					fetch_status: Resource.FETCH_STATUS_DONE,
				},
			};
		}

		return output;
	}

	private async resourceDir(fileModel: FileModel, parentId: Uuid): Promise<File> {
		const parent = await fileModel.load(parentId);
		const fileFullPath = await fileModel.itemFullPath(parent);
		const dirPath = `${fileFullPath.substring(0, fileFullPath.length - 1)}/.resource`;
		return fileModel.pathToFile(`${dirPath}:`);
	}

	public async renderFile(file: File, share: Share, query: Record<string, any>): Promise<FileViewerResponse> {
		const fileModel = this.models.file({ userId: file.owner_id });

		const note: NoteEntity = await this.unserializeItem(ModelType.Note, file);
		const resourceInfos: Record<string, any> = await this.noteResourceInfos(file.parent_id, note);

		if (query.resource_id) {
			if (!resourceInfos[query.resource_id]) throw new ErrorNotFound(`Resource "${query.resource_id}" does not belong to this note`);

			const resourceDir = await this.resourceDir(fileModel, file.parent_id);
			const resourceFile = await fileModel.fileByName(resourceDir.id, query.resource_id);
			const withContent = await fileModel.loadWithContent(resourceFile.id);
			return {
				body: withContent.content,
				mime: withContent.mime_type,
				size: withContent.size,
			};
		} else {
			const markupToHtml = new MarkupToHtml({
				ResourceModel: Resource,
				resourceBaseUrl: `${this.models.share().shareUrl(share.id)}?resource_id=`,
			});

			const result = await markupToHtml.render(note.markup_language, note.body, themeStyle(Setting.THEME_LIGHT), {
				resources: resourceInfos,
				resourceIdToUrl: (resource: ResourceEntity) => {
					return `${this.models.share().shareUrl(share.id)}?resource_id=${resource.id}&t=${resource.updated_time}`;
				},
			});

			const bodyHtml = await this.mustache.renderView({
				cssFiles: ['note'],
				name: 'note',
				path: 'note',
				content: {
					note: {
						...note,
						bodyHtml: result.html,
						updatedDateTime: formatDateTime(note.updated_time),
					},
				},
			});

			return {
				body: bodyHtml,
				mime: 'text/html',
				size: bodyHtml.length,
			};
		}
	}

	public async isItemFile(file: File, query: Record<string, any>): Promise<boolean> {
		if (file.mime_type !== 'text/markdown') return false;

		try {
			await this.unserializeItem(query.resource_id ? ModelType.Resource : ModelType.Note, file);
		} catch (error) {
			// No need to log - it means it's not a note file
			return false;
		}

		return true;
	}

}
