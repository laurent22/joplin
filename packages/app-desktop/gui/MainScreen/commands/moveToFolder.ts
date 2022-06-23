import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';

export const declaration: CommandDeclaration = {
	name: 'moveToFolder',
	label: () => _('Move to notebook'),
};

export class AddOptions {

	private maxDepth = 15;
	public startFolders: any[] = [];

	public addOptions(folders: any[], depth: number, path: string) {
		for (let i = 0; i < folders.length; i++) {
			const folder = folders[i];
			const newPath = path + folder.title;
			this.startFolders.push({ key: folder.id, value: folder.id, label: folder.title, title: folder.title, path: newPath, indentDepth: depth, _indentDepth: depth });
			if (folder.children) this.addOptions(folder.children, (depth + 1) < this.maxDepth ? depth + 1 : this.maxDepth, `${newPath}/`);
		}
	}
}

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			noteIds = noteIds || context.state.selectedNoteIds;

			const folders: any[] = await Folder.sortFolderTree();
			const options = new AddOptions();
			options.addOptions(folders, 0, '');

			comp.setState({
				promptOptions: {
					label: _('Move to notebook:'),
					inputType: 'dropdown',
					value: '',
					autocomplete: options.startFolders,
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
