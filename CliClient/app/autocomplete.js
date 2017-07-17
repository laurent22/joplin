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
	return Folder.all({ includeConflictFolder: true }).then((folders) => {
		let output = [];
		for (let i = 0; i < folders.length; i++) {
			output.push(quotePromptArg(folders[i].title));
		}
		return output;
	});
}

async function autocompleteItems() {
	let items = [];
	if (!app().currentFolder()) {
		items = await Folder.all();
	} else {
		items = await Note.previews(app().currentFolder().id);
	}

	let output = [];
	for (let i = 0; i < items.length; i++) {
		output.push(quotePromptArg(items[i].title));
	}
	
	return output;
}

export { autocompleteFolders, autocompleteItems };