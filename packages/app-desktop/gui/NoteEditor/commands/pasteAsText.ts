import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'pasteAsText',
	label: () => _('Paste as text'),
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async () => {
			comp.editorRef.current.execCommand({ name: 'pasteAsText' });
		},
		enabledCondition: 'oneNoteSelected && richTextEditorVisible',
	};
};
