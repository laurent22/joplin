import { app } from './app.js';
import { Note } from 'lib/models/note.js';
import { Folder } from 'lib/models/folder.js';
import { Tag } from 'lib/models/tag.js';
import { cliUtils } from './cli-utils.js';
import { _ } from 'lib/locale.js';
import fs from 'fs-extra';
import os from 'os';
import yargParser from 'yargs-parser';

function autocompletionFileContent(appName, alias) {
	let content = fs.readFileSync(__dirname + '/autocompletion_template.txt', 'utf8');
	content = content.replace(/\|__APPNAME__\|/g, appName);

	if (!alias) alias = 'joplin_alias_support_is_disabled';
	content = content.replace(/\|__APPALIAS__\|/g, alias);

	return content;
}

function autocompletionScriptPath(profileDir) {
	return profileDir + '/autocompletion.sh';
}

async function installAutocompletionFile(appName, profileDir) {
	if (process.env.SHELL.indexOf('bash') < 0) {
		let error = new Error(_('Only Bash is currently supported for autocompletion.'));
		error.code = 'shellNotSupported';
		throw error;
	}

	const alias = await cliUtils.promptInput(_('Autocompletion can be made to work with an alias too (such as a one-letter command like "j").\nIf you would like to enable this, please type the alias now (leave it empty for no alias):'));

	const content = autocompletionFileContent(appName, alias);
	const filePath = autocompletionScriptPath(profileDir);
	fs.writeFileSync(filePath, content);

	console.info(_('Created autocompletion script "%s".', filePath));

	const bashProfilePath = os.homedir() + '/.bashrc';

	let bashrcContent = fs.readFileSync(bashProfilePath, 'utf8');

	const lineToAdd = 'source ' + filePath;

	if (bashrcContent.indexOf(lineToAdd) >= 0) {
		console.info(_('Autocompletion script is already present in "%s".', bashProfilePath));
	} else {
		bashrcContent += "\n" + lineToAdd + "\n";
		fs.writeFileSync(bashProfilePath, bashrcContent);
		console.info(_('Added autocompletion to "%s".', bashProfilePath));
	}

	if (alias) {
		if (bashrcContent.indexOf('alias ' + alias + '=') >= 0) {
			console.info(_('Alias is already set in "%s".', bashProfilePath));
		} else {
			const l = 'alias ' + alias + '=' + appName;
			bashrcContent += "\n" + l + "\n";
			fs.writeFileSync(bashProfilePath, bashrcContent);
			console.info(_('Added alias to "%s".', bashProfilePath));
		}
	}

	console.info(_("IMPORTANT: run the following command to initialise autocompletion in the current shell:\nsource '%s'", filePath));
}

async function handleAutocompletion(autocompletion) {
	let args = autocompletion.line.slice();
	args.splice(0, 1);
	let current = autocompletion.current - 1;
	const currentWord = args[current] ? args[current] : '';

	// Auto-complete the command name

	if (current == 0) {
		const metadata = await app().commandMetadata();
		let commandNames = [];
		for (let n in metadata) {
			if (!metadata.hasOwnProperty(n)) continue;
			const md = metadata[n];
			if (md.hidden) continue;
			if (currentWord == n) return [n];
			if (n.indexOf(currentWord) === 0) commandNames.push(n);
		}
		return commandNames;
	}

	const commandName = args[0];
	const metadata = await app().commandMetadata();
	const md = metadata[commandName];
	const options = md && md.options ? md.options : [];

	// Auto-complete the command options

	if (currentWord) {
		const includeLongs = currentWord.length == 1 ? currentWord.substr(0, 1) == '-' : currentWord.substr(0, 2) == '--';
		const includeShorts = currentWord.length <= 2 && currentWord.substr(0, 1) == '-' && currentWord.substr(0, 2) != '--';

		if (includeLongs || includeShorts) {			
			const output = [];
			for (let i = 0; i < options.length; i++) {
				const flags = cliUtils.parseFlags(options[i][0]);
				const long = flags.long ? '--' + flags.long : null;
				const short = flags.short ? '-' + flags.short : null;
				if (includeLongs && long && long.indexOf(currentWord) === 0) output.push(long);
				if (includeShorts && short && short.indexOf(currentWord) === 0) output.push(short);
			}
			return output;
		}
	}

	// Auto-complete the command arguments

	let argIndex = -1;
	for (let i = 0; i < args.length; i++) {
		const w = args[i];
		if (i == 0 || w.indexOf('-') == 0) {
			continue;
		}
		argIndex++;
	}

	if (argIndex < 0) return [];

	let cmdUsage = yargParser(md.usage)['_'];
	cmdUsage.splice(0, 1);

	if (cmdUsage.length <= argIndex) return [];

	let argName = cmdUsage[argIndex];
	argName = cliUtils.parseCommandArg(argName).name;

	if (argName == 'note' || argName == 'note-pattern') {
		if (!app().currentFolder()) return [];
		const notes = await Note.previews(app().currentFolder().id, { titlePattern: currentWord + '*' });
		return notes.map((n) => n.title);
	}

	if (argName == 'notebook') {
		const folders = await Folder.search({ titlePattern: currentWord + '*' });
		return folders.map((n) => n.title);
	}

	if (argName == 'tag') {
		let tags = await Tag.search({ titlePattern: currentWord + '*' });
		return tags.map((n) => n.title);
	}

	if (argName == 'tag-command') {
		return filterList(['add', 'remove', 'list'], currentWord);
	}

	if (argName == 'todo-command') {
		return filterList(['toggle', 'clear'], currentWord);
	}

	if (argName == 'command') {
		const commands = await app().commandNames();
		return this.filterList(commands, currentWord);
	}

	return [];
}

function filterList(list, currentWord) {
	let output = [];
	for (let i = 0; i < list.length; i++) {
		if (list[i].indexOf(currentWord) !== 0) continue;
		output.push(list[i]);
	}
	return output;
}

export { handleAutocompletion, installAutocompletionFile, autocompletionScriptPath };