var { app } = require('./app.js');
var { Note } = require('lib/models/note.js');
var { Folder } = require('lib/models/folder.js');
var { Tag } = require('lib/models/tag.js');
var { cliUtils } = require('./cli-utils.js');
var yargParser = require('yargs-parser');

async function handleAutocompletionPromise(line) {
	// Auto-complete the command name
	const names = await app().commandNames();
	let words = line.split(' ');
	//If there is only one word and it is not already a command name then you
	//should look for commmands it could be
	if (words.length == 1) {
		if (names.indexOf(words[0]) === -1) {
			let x = names.filter((n) => n.indexOf(words[0]) === 0);
			if (x.length === 1) {
				return x[0] + ' ';
			}
			return x.length > 0 ? x.map((a) => a + ' ') : line;
		} else {
			return line;
		}
	}
	//There is more than one word and it is a command
	const metadata = (await app().commandMetadata())[words[0]];
	//If for some reason this command does not have any associated metadata
	//just don't autocomplete. However, this should not happen.
	if (metadata === undefined) {
		return line;
	}
	//complete an option
	let next = words.length > 1 ? words[words.length - 1] : '';
	let l = [];
	if (next[0] === '-') {
		for (let i = 0; i<metadata.options.length; i++) {
			const options = metadata.options[i][0].split(' ');
			//if there are multiple options then they will be seperated by comma and
			//space. The comma should be removed
			if (options[0][options[0].length - 1] === ',') {
				options[0] = options[0].slice(0, -1);
			}
			if (words.includes(options[0]) || words.includes(options[1])) {
				continue;
			}
			//First two elements are the flag and the third is the description
			//Only autocomplete long
			if (options.length > 1 && options[1].indexOf(next) === 0) {
				l.push(line.slice(0, line.lastIndexOf(next)) + options[1] + ' ');
			} else if (options[0].indexOf(next) === 0) {
				l.push(line.slice(0, line.lastIndexOf(next)) + options[0] + ' ');
			} 
		}
	}
	//Complete an argument
	//Determine the number of positional arguments by counting the number of
	//words that don't start with a - less one for the command name
	const positionalArgs = words.filter((a)=>a.indexOf('-') !== 0 && a !== '').length - 1;

	let cmdUsage = yargParser(metadata.usage)['_'];
	cmdUsage.splice(0, 1);

	if (cmdUsage.length > positionalArgs) {

		let argName = cmdUsage[positionalArgs];
		argName = cliUtils.parseCommandArg(argName).name;

		if (argName == 'note' || argName == 'note-pattern' && app().currentFolder()) {
			const notes = await Note.previews(app().currentFolder().id, { titlePattern: next + '*' });
			l = l.concat(notes.map((n) => line.slice(0, line.lastIndexOf(next)) + n.title + ' '));
		}

		if (argName == 'notebook') {
			const folders = await Folder.search({ titlePattern: next + '*' });
			l = l.concat(folders.map((n) => line.slice(0, line.lastIndexOf(next)) + n.title + ' '));
		}

		if (argName == 'tag') {
			let tags = await Tag.search({ titlePattern: next + '*' });
			l = l.concat(tags.map((n) => line.slice(0, line.lastIndexOf(next)) + n.title + ' '));
		}

		if (argName == 'tag-command') {
			let c = filterList(['add', 'remove', 'list'], next);
			l = l.concat(c.map((n) => line.slice(0, line.lastIndexOf(next)) + n + ' '))
		}

		if (argName == 'todo-command') {
			let c = filterList(['toggle', 'clear'], next);
			l = l.concat(c.map((n) => line.slice(0, line.lastIndexOf(next)) + n + ' '))
		}
	}
	if (l.length === 1) {
		return l[0];
	} else if (l.length > 1) {
		return l;
	}
	return line;

}
function handleAutocompletion(str, callback) {
	handleAutocompletionPromise(str).then(function(res) {
		callback(undefined, res);
	});
}

function filterList(list, next) {
	let output = [];
	for (let i = 0; i < list.length; i++) {
		if (list[i].indexOf(next) !== 0) continue;
		output.push(list[i]);
	}
	return output;
}

module.exports = { handleAutocompletion };
