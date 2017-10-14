import fs from 'fs-extra';
import { BaseCommand } from './base-command.js';
import { uuid } from 'lib/uuid.js';
import { app } from './app.js';
import { _ } from 'lib/locale.js';
import { Folder } from 'lib/models/folder.js';
import { Note } from 'lib/models/note.js';
import { Setting } from 'lib/models/setting.js';
import { BaseModel } from 'lib/base-model.js';
import { cliUtils } from './cli-utils.js';
import { time } from 'lib/time-utils.js';

class Command extends BaseCommand {

	usage() {
		return 'edit <note>';
	}

	description() {
		return _('Edit note.');
	}

	async action(args) {
		let watcher = null;
		let tempFilePath = null;

		const onFinishedEditing = async () => {
			if (tempFilePath) fs.removeSync(tempFilePath);
		}

		const textEditorPath = () => {
			if (Setting.value('editor')) return Setting.value('editor');
			if (process.env.EDITOR) return process.env.EDITOR;
			throw new Error(_('No text editor is defined. Please set it using `config editor <editor-path>`'));
		}

		try {		
			// -------------------------------------------------------------------------
			// Load note or create it if it doesn't exist
			// -------------------------------------------------------------------------

			let title = args['note'];

			if (!app().currentFolder()) throw new Error(_('No active notebook.'));
			let note = await app().loadItem(BaseModel.TYPE_NOTE, title);

			if (!note) {
				const ok = await this.prompt(_('Note does not exist: "%s". Create it?', title));
				if (!ok) return;
				note = await Note.save({ title: title, parent_id: app().currentFolder().id });
				note = await Note.load(note.id);
			}

			// -------------------------------------------------------------------------
			// Create the file to be edited and prepare the editor program arguments
			// -------------------------------------------------------------------------

			let editorPath = textEditorPath();
			let editorArgs = editorPath.split(' ');

			editorPath = editorArgs[0];
			editorArgs = editorArgs.splice(1);

			const originalContent = await Note.serializeForEdit(note);

			tempFilePath = Setting.value('tempDir') + '/' + uuid.create() + '.md';
			editorArgs.push(tempFilePath);

			await fs.writeFile(tempFilePath, originalContent);

			// -------------------------------------------------------------------------
			// Start editing the file
			// -------------------------------------------------------------------------

			this.logger().info('Disabling fullscreen...');

			this.stdout(_('Starting to edit note. Close the editor to get back to the prompt.'));
			await this.forceRender();

			const spawnSync	= require('child_process').spawnSync;
			spawnSync(editorPath, editorArgs, { stdio: 'inherit' });

			await this.forceRender();

			// -------------------------------------------------------------------------
			// Save the note and clean up
			// -------------------------------------------------------------------------

			const updatedContent = await fs.readFile(tempFilePath, 'utf8');
			if (updatedContent !== originalContent) {
				let updatedNote = await Note.unserializeForEdit(updatedContent);
				updatedNote.id = note.id;
				await Note.save(updatedNote);
				this.logger().info('Note has been saved');
			}

			await onFinishedEditing();

		} catch(error) {
			await onFinishedEditing();
			throw error;
		}
	}

}

module.exports = Command;