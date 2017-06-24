import { Note } from 'lib/models/note.js';
import { Folder } from 'lib/models/folder.js';
import { promiseChain } from 'lib/promise-utils.js';

function createNotes(id = 1, parentId) {
	let notes = [];
	if (id === 1) {
		notes.push({ parent_id: parentId, title: 'note one', body: 'content of note one' });
		notes.push({ parent_id: parentId, title: 'note two', body: 'content of note two' });
	} else {
		throw new Error('Invalid ID: ' + id);
	}

	let output = [];
	let chain = [];
	for (let i = 0; i < notes.length; i++) {
		chain.push(() => {
			return Note.save(notes[i]).then((note) => {
				output.push(note);
				return output;
			});
		});
	}

	return promiseChain(chain, []);
}

function createFolders(id = 1) {
	let folders = [];
	if (id === 1) {
		folders.push({ title: 'myfolder1' });
		folders.push({ title: 'myfolder2' });
		folders.push({ title: 'myfolder3' });
	} else {
		throw new Error('Invalid ID: ' + id);
	}

	let output = [];
	let chain = [];
	for (let i = 0; i < folders.length; i++) {
		chain.push(() => {
			return Folder.save(folders[i]).then((folder) => {
				output.push(folder);
				return output;
			});
		});
	}

	return promiseChain(chain, []);
}

function createFoldersAndNotes(id = 1) {
	return createFolders(id).then((folders) => {
		return createNotes(id, folders[0].id);
	});
}

export { createNotes, createFolders, createFoldersAndNotes };