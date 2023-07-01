import BaseModel from '../BaseModel';
import { fileApi } from '../testing/../testing/test-utils';
import Folder from '../models/Folder';
import Note from '../models/Note';
import BaseItem from '../models/BaseItem';

export async function allNotesFolders() {
	const folders = await Folder.all();
	const notes = await Note.all();
	return folders.concat(notes);
}

async function remoteItemsByTypes(types: number[]) {
	const list = await fileApi().list('', { includeDirs: false, syncItemsOnly: true });
	if (list.hasMore) throw new Error('Not implemented!!!');
	const files = list.items;

	const output = [];
	for (const file of files) {
		const remoteContent = await fileApi().get(file.path);
		const content = await BaseItem.unserialize(remoteContent);
		if (types.indexOf(content.type_) < 0) continue;
		output.push(content);
	}
	return output;
}

export async function remoteNotesAndFolders() {
	return remoteItemsByTypes([BaseModel.TYPE_NOTE, BaseModel.TYPE_FOLDER]);
}

export async function remoteNotesFoldersResources() {
	return remoteItemsByTypes([BaseModel.TYPE_NOTE, BaseModel.TYPE_FOLDER, BaseModel.TYPE_RESOURCE]);
}

export async function remoteResources() {
	return remoteItemsByTypes([BaseModel.TYPE_RESOURCE]);
}

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
export async function localNotesFoldersSameAsRemote(locals: any[], expect: Function) {
	let error = null;
	try {
		const nf = await remoteNotesAndFolders();
		expect(locals.length).toBe(nf.length);

		for (let i = 0; i < locals.length; i++) {
			const dbItem = locals[i];
			const path = BaseItem.systemPath(dbItem);
			const remote = await fileApi().stat(path);

			expect(!!remote).toBe(true);
			if (!remote) continue;

			let remoteContent = await fileApi().get(path);

			remoteContent = dbItem.type_ === BaseModel.TYPE_NOTE ? await Note.unserialize(remoteContent) : await Folder.unserialize(remoteContent);
			expect(remoteContent.title).toBe(dbItem.title);
		}
	} catch (e) {
		error = e;
	}

	expect(error).toBe(null);
}
