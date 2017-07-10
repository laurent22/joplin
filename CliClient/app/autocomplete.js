import { app } from './app.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';

// For now, to go around this issue: https://github.com/dthree/vorpal/issues/114
function quotePromptArg(s) {
	if (s.indexOf(' ') >= 0) {
		return '"' + s + '"';
	}
	return s;
}

function autocompleteFolders() {
	return Folder.all().then((folders) => {
		let output = [];
		for (let i = 0; i < folders.length; i++) {
			output.push(quotePromptArg(folders[i].title));
		}
		output.push('..');
		output.push('.');
		return output;
	});
}

function autocompleteItems() {
	let promise = null;
	if (!app().currentFolder()) {
		promise = Folder.all();
	} else {
		promise = Note.previews(app().currentFolder().id);
	}

	return promise.then((items) => {
		let output = [];
		for (let i = 0; i < items.length; i++) {
			output.push(quotePromptArg(items[i].title));
		}
		return output;			
	});
}

export { autocompleteFolders, autocompleteItems };