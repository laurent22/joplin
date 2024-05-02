import { FolderEntity, NoteEntity } from '../database/types';
import FolderMirror from './FolderMirror';

export default class FileMirroringService {
	private static instance_: FileMirroringService|null = null;

	public static instance() {
		this.instance_ ??= new FileMirroringService();
		return this.instance_;
	}

	private mirrors_: FolderMirror[] = [];

	public constructor() {}

	public mirrorFolder(outputPath: string, baseFolderId: string) {
		const folderMirror = new FolderMirror(outputPath, baseFolderId);
		this.mirrors_.push(folderMirror);
		return folderMirror;
	}

	private static mirrors() {
		return this.instance_?.mirrors_ ?? [];
	}

	public static onFolderDelete(id: string) {
		return this.mirrors().map(mirror => mirror.onLocalItemDelete(id));
	}

	public static onFolderUpdate(item: FolderEntity) {
		return this.mirrors().map(mirror => mirror.onLocalItemUpdate(item));
	}

	public static onNoteUpdate(note: NoteEntity) {
		return this.mirrors().map(mirror => mirror.onLocalItemUpdate(note));
	}

	public static onNoteDelete(id: string) {
		return this.mirrors().map(mirror => mirror.onLocalItemDelete(id));
	}

	// eslint-disable-next-line -- Currently no better type for action than 'any'.
	public static handleReducerAction(action: any) {
		if (action.type === 'NOTE_DELETE') {
			this.onNoteDelete(action.id);
		} else if (action.type === 'NOTE_UPDATE_ONE') {
			this.onNoteUpdate(action.note);
		} else if (action.type === 'FOLDER_UPDATE_ONE') {
			this.onFolderUpdate(action.folder);
		} else if (action.type === 'FOLDER_DELETE') {
			this.onFolderDelete(action.id);
		}
	}
}
