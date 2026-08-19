import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { WindowCommandDependencies } from '../utils/types';

export const declaration: CommandDeclaration = {
	name: 'pasteAsText',
	label: () => _('Paste as text'),
};

export const runtime = (comp: WindowCommandDependencies): CommandRuntime => {
	return {
		execute: async () => {
			void comp.editorRef.current.execCommand({ name: 'pasteAsText' });
		},
		enabledCondition: 'oneNoteSelected && richTextEditorVisible',
	};
};
