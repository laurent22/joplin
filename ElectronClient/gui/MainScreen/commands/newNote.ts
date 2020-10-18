import { utils, CommandRuntime, CommandDeclaration, CommandContext } from 'lib/services/CommandService';
import { _ } from 'lib/locale';
const Setting = require('lib/models/Setting').default;
const Note = require('lib/models/Note');
const TemplateUtils = require('lib/TemplateUtils');

export const declaration:CommandDeclaration = {
	name: 'newNote',
	label: () => _('New note'),
	iconName: 'fa-file',
};

export const runtime = ():CommandRuntime => {
	return {
		execute: async (_context:CommandContext, template:string = null, isTodo:boolean = false) => {
			const folderId = Setting.value('activeFolderId');
			if (!folderId) return;

			const body = template ? TemplateUtils.render(template) : '';

			const defaultValues = Note.previewFieldsWithDefaultValues({ includeTimestamps: false });

			let newNote = Object.assign({}, defaultValues, {
				parent_id: folderId,
				is_todo: isTodo ? 1 : 0,
				body: body,
			});

			newNote = await Note.save(newNote, { provisional: true });

			utils.store.dispatch({
				type: 'NOTE_SELECT',
				id: newNote.id,
			});
		},
		enabledCondition: 'oneFolderSelected && !inConflictFolder',
	};
};
