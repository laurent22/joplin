import * as fs from 'fs-extra';
import BaseCommand from './base-command';
import { splitCommandString } from '@joplin/utils';
import uuid from '@joplin/lib/uuid';
import app from './app';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
import BaseModel from '@joplin/lib/BaseModel';

class Command extends BaseCommand {
	public override usage() {
		return 'edit <note>';
	}

	public override description() {
		return _('Edit note.');
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public override async action(args: any) {
		let tempFilePath: string|null = null;

		const onFinishedEditing = async () => {
			if (tempFilePath) fs.removeSync(tempFilePath);
		};

		const textEditorPath = () => {
			if (Setting.value('editor')) return Setting.value('editor');
			if (process.env.EDITOR) return process.env.EDITOR;
			throw new Error(_('No text editor is defined. Please set it using `config editor <editor-path>`'));
		};

		try {
			// -------------------------------------------------------------------------
			// Load note or create it if it doesn't exist
			// -------------------------------------------------------------------------

			const title = args['note'];

			if (!app().currentFolder()) throw new Error(_('No active notebook.'));
			let note = await app().loadItem(BaseModel.TYPE_NOTE, title);

			this.encryptionCheck(note);

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
			let editorArgs = splitCommandString(editorPath);

			editorPath = editorArgs[0];
			editorArgs = editorArgs.splice(1);

			const originalContent = await Note.serializeForEdit(note);

			tempFilePath = `${Setting.value('tempDir')}/${uuid.create()}.md`;
			editorArgs.push(tempFilePath);

			await fs.writeFile(tempFilePath, originalContent);

			// -------------------------------------------------------------------------
			// Start editing the file
			// -------------------------------------------------------------------------

			this.logger().info('Disabling fullscreen...');

			app().gui().showModalOverlay(_('Starting to edit note. Close the editor to get back to the prompt.'));
			await app().gui().forceRender();
			const termState = app().gui().termSaveState();

			const spawnSync = require('child_process').spawnSync;
			const result = spawnSync(editorPath, editorArgs, { stdio: 'inherit' });

			if (result.error) this.stdout(_('Error opening note in editor: %s', result.error.message));

			app().gui().termRestoreState(termState);
			app().gui().hideModalOverlay();
			app().gui().forceRender();

			// -------------------------------------------------------------------------
			// Save the note and clean up
			// -------------------------------------------------------------------------

			const updatedContent = await fs.readFile(tempFilePath, 'utf8');
			if (updatedContent !== originalContent) {
				const updatedNote = await Note.unserializeForEdit(updatedContent);
				updatedNote.id = note.id;
				await Note.save(updatedNote);
				this.stdout(_('Note has been saved.'));
			}

			this.dispatch({
				type: 'NOTE_SELECT',
				id: note.id,
			});

			await onFinishedEditing();
		} catch (error) {
			await onFinishedEditing();
			throw error;
		}
	}
}

module.exports = Command;
