import { normalize } from 'path';
import { ModelType } from '../../BaseModel';
import { FolderEntity, NoteEntity } from '../database/types';
import FolderMirror from './FolderMirror';
import eventManager, { EventName } from '../../eventManager';

export default class FolderMirroringService {
	private static instance_: FolderMirroringService|null = null;

	public static instance() {
		this.instance_ ??= new FolderMirroringService();
		return this.instance_;
	}

	// Maps from directories to mirrors
	private mirrors_: FolderMirror[] = [];

	public constructor() {
		eventManager.on(EventName.ResourceChange, (event) => {
			for (const mirror of this.mirrors_) {
				mirror.onLocalItemUpdate({ type_: ModelType.Resource, ...event.resource });
			}
		});
	}

	public async mirrorFolder(outputPath: string, baseFolderId: string, uuidCreate?: ()=> string) {
		outputPath = normalize(outputPath);

		for (const mirror of this.mirrors_) {
			if (mirror.baseFilePath === outputPath) {
				if (mirror.baseFolderId === baseFolderId) {
					await mirror.fullSync();
					return mirror;
				} else {
					throw new Error('Can\'t mirror two different folders to the same path.');
				}
			}
		}

		const folderMirror = new FolderMirror(outputPath, baseFolderId);

		// Allows consistent ID generation during tests
		if (uuidCreate) {
			folderMirror.test__setCreateUuid(uuidCreate);
		}
		this.mirrors_.push(folderMirror);
		await folderMirror.fullSync();
		await folderMirror.watch();
		return folderMirror;
	}

	public async reset() {
		const mirrors = this.mirrors_;
		this.mirrors_ = [];
		for (const mirror of mirrors) {
			await mirror.stopWatching();
			await mirror.waitForIdle();
		}
	}

	private static mirrors() {
		return this.instance_?.mirrors_ ?? [];
	}

	public static onFolderDelete(id: string) {
		for (const mirror of this.mirrors()) {
			mirror.onLocalItemDelete(id);
		}
	}

	public static onFolderUpdate(item: FolderEntity) {
		for (const mirror of this.mirrors()) {
			mirror.onLocalItemUpdate({ type_: ModelType.Folder, ...item });
		}
	}

	public static onNoteUpdate(note: NoteEntity) {
		for (const mirror of this.mirrors()) {
			mirror.onLocalItemUpdate({ type_: ModelType.Note, ...note });
		}
	}

	public static onNoteDelete(id: string) {
		for (const mirror of this.mirrors()) {
			mirror.onLocalItemDelete(id);
		}
	}

	// eslint-disable-next-line -- Currently no better type for action than 'any'.
	public static handleReducerAction(action: any) {
		if (action.type === 'NOTE_DELETE') {
			this.onNoteDelete(action.id);
		} else if (action.type === 'NOTE_UPDATE_ONE') {
			this.onNoteUpdate(action.note);
		} else if (action.type === 'FOLDER_UPDATE_ONE') {
			this.onFolderUpdate(action.item);
		} else if (action.type === 'FOLDER_DELETE') {
			this.onFolderDelete(action.id);
		}
	}
}
