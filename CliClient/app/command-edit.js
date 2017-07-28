import fs from 'fs-extra';
import { BaseCommand } from './base-command.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { vorpalUtils } from './vorpal-utils.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { Setting } from 'lib/models/setting.js';
import { BaseModel } from 'lib/base-model.js';
import { autocompleteItems } from './autocomplete.js';

class Command extends BaseCommand {

	usage() {
		return 'edit <title>';
	}

	description() {
		return _('Edit note.');
	}

	autocomplete() {
		return { data: autocompleteItems };
	}

	async action(args) {
		let watcher = null;
		let newNote = null;

		const onFinishedEditing = async () => {
			if (watcher) watcher.close();
			app().vorpal().show();
			newNote = null;
			this.log(_('Done editing.'));
		}

		const textEditorPath = () => {
			if (Setting.value('editor')) return Setting.value('editor');
			if (process.env.EDITOR) return process.env.EDITOR;
			throw new Error(_('No text editor is defined. Please set it using `config editor <editor-path>`'));
		}

		try {		
			let title = args['title'];

			if (!app().currentFolder()) throw new Error(_('No active notebook.'));
			let note = await app().loadItem(BaseModel.TYPE_NOTE, title);

			if (!note) {
				let ok = await vorpalUtils.cmdPromptConfirm(this, _('Note does not exist: "%s". Create it?', title))
				if (!ok) return;
				newNote = await Note.save({ title: title, parent_id: app().currentFolder().id });
				note = await Note.load(newNote.id);
			}

			let editorPath = textEditorPath();
			let editorArgs = editorPath.split(' ');

			editorPath = editorArgs[0];
			editorArgs = editorArgs.splice(1);

			let content = await Note.serializeForEdit(note);

			let tempFilePath = Setting.value('tempDir') + '/' + Note.systemPath(note);
			editorArgs.push(tempFilePath);

			const spawn	= require('child_process').spawn;

			this.log(_('Starting to edit note. Close the editor to get back to the prompt.'));

			app().vorpal().hide();

			await fs.writeFile(tempFilePath, content);

			let watchTimeout = null;
			watcher = fs.watch(tempFilePath, (eventType, filename) => {
				// We need a timeout because for each change to the file, multiple events are generated.

				if (watchTimeout) return;

				watchTimeout = setTimeout(async () => {
					let updatedNote = await fs.readFile(tempFilePath, 'utf8');
					updatedNote = await Note.unserializeForEdit(updatedNote);
					updatedNote.id = note.id;
					await Note.save(updatedNote);
					watchTimeout = null;
				}, 200);
			});

			const childProcess = spawn(editorPath, editorArgs, { stdio: 'inherit' });
			childProcess.on('exit', async (error, code) => {
				await onFinishedEditing();
			});
		} catch(error) {
			await onFinishedEditing();
			throw error;
		}
	}

}

module.exports = Command;