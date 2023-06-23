import InteropService_Exporter_Base from './InteropService_Exporter_Base';
import BaseModel from '../../BaseModel';
import shim from '../../shim';
import markdownUtils from '../../markdownUtils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import { NoteEntity, ResourceEntity } from '../database/types';
import { basename, dirname, friendlySafeFilename } from '../../path-utils';
import { MarkupToHtml } from '@joplin/renderer';

export default class InteropService_Exporter_Md extends InteropService_Exporter_Base {

	private destDir_: string;
	private resourceDir_: string;
	private createdDirs_: string[];

	public async init(destDir: string) {
		this.destDir_ = destDir;
		this.resourceDir_ = destDir ? `${destDir}/_resources` : null;
		this.createdDirs_ = [];

		await shim.fsDriver().mkdir(this.destDir_);
		await shim.fsDriver().mkdir(this.resourceDir_);
	}

	private async makeDirPath_(item: any, pathPart: string = null, findUniqueFilename: boolean = true) {
		let output = '';
		while (true) {
			if (item.type_ === BaseModel.TYPE_FOLDER) {
				if (pathPart) {
					output = `${pathPart}/${output}`;
				} else {
					output = `${friendlySafeFilename(item.title, null)}/${output}`;
					if (findUniqueFilename) output = await shim.fsDriver().findUniqueFilename(output, null, true);
				}
			}
			if (!item.parent_id) return output;
			item = await Folder.load(item.parent_id);
		}
	}

	private async relaceLinkedItemIdsByRelativePaths_(item: any) {
		const relativePathToRoot = await this.makeDirPath_(item, '..');

		const newBody = await this.replaceResourceIdsByRelativePaths_(item.body, relativePathToRoot);
		return await this.replaceNoteIdsByRelativePaths_(newBody, relativePathToRoot);
	}

	private async replaceResourceIdsByRelativePaths_(noteBody: string, relativePathToRoot: string) {
		const linkedResourceIds = await Note.linkedResourceIds(noteBody);
		const resourcePaths = this.context() && this.context().destResourcePaths ? this.context().destResourcePaths : {};

		const createRelativePath = function(resourcePath: string) {
			return `${relativePathToRoot}_resources/${basename(resourcePath)}`;
		};
		return await this.replaceItemIdsByRelativePaths_(noteBody, linkedResourceIds, resourcePaths, createRelativePath);
	}

	private async replaceNoteIdsByRelativePaths_(noteBody: string, relativePathToRoot: string) {
		const linkedNoteIds = await Note.linkedNoteIds(noteBody);
		const notePaths = this.context() && this.context().notePaths ? this.context().notePaths : {};

		const createRelativePath = function(notePath: string) {
			return markdownUtils.escapeLinkUrl(`${relativePathToRoot}${notePath}`.trim());
		};
		return await this.replaceItemIdsByRelativePaths_(noteBody, linkedNoteIds, notePaths, createRelativePath);
	}

	private async replaceItemIdsByRelativePaths_(noteBody: string, linkedItemIds: string[], paths: any, fn_createRelativePath: Function) {
		let newBody = noteBody;

		for (let i = 0; i < linkedItemIds.length; i++) {
			const id = linkedItemIds[i];
			const itemPath = fn_createRelativePath(paths[id]);
			newBody = newBody.replace(new RegExp(`:/${id}`, 'g'), markdownUtils.escapeLinkUrl(itemPath));
		}

		return newBody;
	}

	public async prepareForProcessingItemType(itemType: number, itemsToExport: any[]) {
		if (itemType === BaseModel.TYPE_NOTE) {
			// Create unique file path for the note
			const context: any = {
				notePaths: {},
			};
			for (let i = 0; i < itemsToExport.length; i++) {
				const it = itemsToExport[i].type;

				if (it !== itemType) continue;

				const itemOrId = itemsToExport[i].itemOrId;
				const note = typeof itemOrId === 'object' ? itemOrId : await Note.load(itemOrId);

				if (!note) continue;

				const ext = note.markup_language === MarkupToHtml.MARKUP_LANGUAGE_HTML ? 'html' : 'md';
				let notePath = `${await this.makeDirPath_(note, null, false)}${friendlySafeFilename(note.title, null)}.${ext}`;
				notePath = await shim.fsDriver().findUniqueFilename(`${this.destDir_}/${notePath}`, Object.values(context.notePaths), true);
				context.notePaths[note.id] = notePath;
			}

			// Strip the absolute path to export dir and keep only the relative paths
			const destDir = this.destDir_;
			Object.keys(context.notePaths).map((id) => {
				context.notePaths[id] = context.notePaths[id].substr(destDir.length + 1);
			});

			this.updateContext(context);
		}
	}

	protected async getNoteExportContent_(modNote: NoteEntity) {
		return await Note.replaceResourceInternalToExternalLinks(await Note.serialize(modNote, ['body']));
	}

	public async processItem(_itemType: number, item: any) {
		if ([BaseModel.TYPE_NOTE, BaseModel.TYPE_FOLDER].indexOf(item.type_) < 0) return;

		if (item.type_ === BaseModel.TYPE_FOLDER) {
			const dirPath = `${this.destDir_}/${await this.makeDirPath_(item)}`;

			if (this.createdDirs_.indexOf(dirPath) < 0) {
				await shim.fsDriver().mkdir(dirPath);
				this.createdDirs_.push(dirPath);
			}

		} else if (item.type_ === BaseModel.TYPE_NOTE) {
			const notePaths = this.context() && this.context().notePaths ? this.context().notePaths : {};
			const noteFilePath = `${this.destDir_}/${notePaths[item.id]}`;

			const noteBody = await this.relaceLinkedItemIdsByRelativePaths_(item);
			const modNote = { ...item, body: noteBody };
			const noteContent = await this.getNoteExportContent_(modNote);
			await shim.fsDriver().mkdir(dirname(noteFilePath));
			await shim.fsDriver().writeFile(noteFilePath, noteContent, 'utf-8');
		}
	}

	private async findReasonableFilename(resource: ResourceEntity, filePath: string) {
		let fileName = basename(filePath);

		if (resource.filename) {
			fileName = resource.filename;
		} else if (resource.title) {
			fileName = friendlySafeFilename(resource.title, null, true);
		}

		// Fall back on the resource filename saved in the users resource folder
		return fileName;
	}

	public async processResource(resource: ResourceEntity, filePath: string) {
		const context = this.context();
		if (!context.destResourcePaths) context.destResourcePaths = {};

		const fileName = await this.findReasonableFilename(resource, filePath);
		let destResourcePath = `${this.resourceDir_}/${fileName}`;
		destResourcePath = await shim.fsDriver().findUniqueFilename(destResourcePath, Object.values(context.destResourcePaths), true);
		await shim.fsDriver().copy(filePath, destResourcePath);

		context.destResourcePaths[resource.id] = destResourcePath;
		this.updateContext(context);
	}

	public async close() {}
}
