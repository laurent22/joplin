var { app } = require('./app.js');
var Note = require('lib/models/Note.js');
var Folder = require('lib/models/Folder.js');
var Tag = require('lib/models/Tag.js');
var { cliUtils } = require('./cli-utils.js');
var yargParser = require('yargs-parser');
var fs = require('fs-extra');

async function handleAutocompletionPromise(line) {
	// Auto-complete the command name
	const names = await app().commandNames();
	let words = getArguments(line);
	// If there is only one word and it is not already a command name then you
	// should look for commands it could be
	if (words.length == 1) {
		if (names.indexOf(words[0]) === -1) {
			let x = names.filter(n => n.indexOf(words[0]) === 0);
			if (x.length === 1) {
				return `${x[0]} `;
			}
			return x.length > 0 ? x.map(a => `${a} `) : line;
		} else {
			return line;
		}
	}
	// There is more than one word and it is a command
	const metadata = (await app().commandMetadata())[words[0]];
	// If for some reason this command does not have any associated metadata
	// just don't autocomplete. However, this should not happen.
	if (metadata === undefined) {
		return line;
	}

	if (words[0] === 'tag' && words[1] === 'notetags') {
		metadata.usage = 'tag <tag-command> <note>';
	}

	// complete an option
	let next = words.length > 1 ? words[words.length - 1] : '';
	let l = [];
	if (next[0] === '-') {
		for (let i = 0; i < metadata.options.length; i++) {
			const options = metadata.options[i][0].split(' ');
			// if there are multiple options then they will be separated by comma and
			// space. The comma should be removed
			if (options[0][options[0].length - 1] === ',') {
				options[0] = options[0].slice(0, -1);
			}
			if (words.includes(options[0]) || words.includes(options[1])) {
				continue;
			}
			// First two elements are the flag and the third is the description
			// Only autocomplete long
			if (options.length > 1 && options[1].indexOf(next) === 0) {
				l.push(options[1]);
			} else if (options[0].indexOf(next) === 0) {
				l.push(options[0]);
			}
		}
		if (l.length === 0) {
			return line;
		}
		let ret = l.map(a => toCommandLine(a));
		ret.prefix = `${toCommandLine(words.slice(0, -1))} `;
		return ret;
	}
	// Complete an argument
	// Determine the number of positional arguments by counting the number of
	// words that don't start with a - less one for the command name
	const positionalArgs = words.filter(a => a.indexOf('-') !== 0).length - 1;

	let cmdUsage = yargParser(metadata.usage)['_'];
	cmdUsage.splice(0, 1);

	if (cmdUsage.length >= positionalArgs) {
		let argName = cmdUsage[positionalArgs - 1];
		argName = cliUtils.parseCommandArg(argName).name;

		const currentFolder = app().currentFolder();

		if (argName == 'note' || argName == 'note-pattern') {
			const notes = currentFolder ? await Note.previews(currentFolder.id, { titlePattern: `${next}*` }) : [];
			l.push(...notes.map(n => n.title));
		}

		if (argName == 'notebook') {
			const folders = await Folder.search({ titlePattern: `${next}*` });
			l.push(...folders.map(n => n.title));
		}

		if (argName == 'item') {
			const notes = currentFolder ? await Note.previews(currentFolder.id, { titlePattern: `${next}*` }) : [];
			const folders = await Folder.search({ titlePattern: `${next}*` });
			l.push(...notes.map(n => n.title), folders.map(n => n.title));
		}

		if (argName == 'tag') {
			let tags = await Tag.search({ titlePattern: `${next}*` });
			l.push(...tags.map(n => n.title));
		}

		if (argName == 'file') {
			let files = await fs.readdir('.');
			l.push(...files);
		}

		if (argName == 'tag-command') {
			let c = filterList(['add', 'remove', 'list', 'notetags'], next);
			l.push(...c);
		}

		if (argName == 'todo-command') {
			let c = filterList(['toggle', 'clear'], next);
			l.push(...c);
		}
	}
	if (l.length === 1) {
		return toCommandLine([...words.slice(0, -1), l[0]]);
	} else if (l.length > 1) {
		let ret = l.map(a => toCommandLine(a));
		ret.prefix = `${toCommandLine(words.slice(0, -1))} `;
		return ret;
	}
	return line;
}
function handleAutocompletion(str, callback) {
	handleAutocompletionPromise(str).then(function(res) {
		callback(undefined, res);
	});
}
function toCommandLine(args) {
	if (Array.isArray(args)) {
		return args
			.map(function(a) {
				if (a.indexOf('"') !== -1 || a.indexOf(' ') !== -1) {
					return `'${a}'`;
				} else if (a.indexOf('\'') !== -1) {
					return `"${a}"`;
				} else {
					return a;
				}
			})
			.join(' ');
	} else {
		if (args.indexOf('"') !== -1 || args.indexOf(' ') !== -1) {
			return `'${args}' `;
		} else if (args.indexOf('\'') !== -1) {
			return `"${args}" `;
		} else {
			return `${args} `;
		}
	}
}
function getArguments(line) {
	let inSingleQuotes = false;
	let inDoubleQuotes = false;
	let currentWord = '';
	let parsed = [];
	for (let i = 0; i < line.length; i++) {
		if (line[i] === '"') {
			if (inDoubleQuotes) {
				inDoubleQuotes = false;
				// maybe push word to parsed?
				// currentWord += '"';
			} else {
				inDoubleQuotes = true;
				// currentWord += '"';
			}
		} else if (line[i] === '\'') {
			if (inSingleQuotes) {
				inSingleQuotes = false;
				// maybe push word to parsed?
				// currentWord += "'";
			} else {
				inSingleQuotes = true;
				// currentWord += "'";
			}
		} else if (/\s/.test(line[i]) && !(inDoubleQuotes || inSingleQuotes)) {
			if (currentWord !== '') {
				parsed.push(currentWord);
				currentWord = '';
			}
		} else {
			currentWord += line[i];
		}
	}
	if (!(inSingleQuotes || inDoubleQuotes) && /\s/.test(line[line.length - 1])) {
		parsed.push('');
	} else {
		parsed.push(currentWord);
	}
	return parsed;
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
