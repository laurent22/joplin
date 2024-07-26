import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';

export const declaration: CommandDeclaration = {
	name: 'moveToFolder',
	label: () => _('Move to notebook'),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			noteIds = noteIds || context.state.selectedNoteIds;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const folders: any[] = await Folder.sortFolderTree();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const startFolders: any[] = [];
			const maxDepth = 15;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const addOptions = (folders: any[], depth: number) => {
				for (let i = 0; i < folders.length; i++) {
					const folder = folders[i];
					startFolders.push({ key: folder.id, value: folder.id, label: folder.title, indentDepth: depth });
					if (folder.children) addOptions(folder.children, (depth + 1) < maxDepth ? depth + 1 : maxDepth);
				}
			};

			addOptions(folders, 0);

			comp.setState({
				promptOptions: {
					label: _('Move to notebook:'),
					inputType: 'dropdown',
					value: '',
					autocomplete: startFolders,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					onClose: async (answer: any) => {
						if (answer) {
							for (let i = 0; i < noteIds.length; i++) {
								await Note.moveToFolder(noteIds[i], answer.value);
							}
						}
						comp.setState({ promptOptions: null });
					},
				},
			});
		},
		enabledCondition: 'someNotesSelected && !noteIsReadOnly',
	};
};
