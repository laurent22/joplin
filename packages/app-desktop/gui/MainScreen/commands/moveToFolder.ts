import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';

export const declaration: CommandDeclaration = {
	name: 'moveToFolder',
	label: () => _('Move to notebook'),
};

// issue 6167: https://github.com/laurent22/joplin/issues/6167
// need to export this function to make testing
// easier/possible
export const addOptions = (folders: any[], depth: number, parentPath?: string) => {
	const startFolders: any[] = [];
	const maxDepth = 15;

	const innerAddOptions = (folders: any[], depth: number, parentPath?: string) => {
		for (let i = 0; i < folders.length; i++) {
			const folder = folders[i];

			let label;
			if (!parentPath) label = folder.title;
			else label = `${parentPath} >> ${folder.title}`;

			startFolders.push({ key: folder.id, value: folder.id, label, indentDepth: depth });
			if (folder.children) innerAddOptions(folder.children, (depth + 1) < maxDepth ? depth + 1 : maxDepth, label);
		}
	};

	innerAddOptions(folders, depth, parentPath);

	return startFolders;
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			noteIds = noteIds || context.state.selectedNoteIds;

			const folders: any[] = await Folder.sortFolderTree();

			const startFolders = addOptions(folders, 0);

			comp.setState({
				promptOptions: {
					label: _('Move to notebook:'),
					inputType: 'dropdown',
					value: '',
					autocomplete: startFolders,
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
		enabledCondition: 'someNotesSelected',
	};
};
