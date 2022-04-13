import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';

export const declaration: CommandDeclaration = {
	name: 'moveToFolder',
	label: () => _('Move to notebook'),
};

export class AddOptions {

	public startFolders: any[] = [];

	public addOptions(folders: any[], path: string) {
		for (let i = 0; i < folders.length; i++) {
			const folder = folders[i];
			// When NoteBook doesn't get a title
			if (folder.title === '') {
				folder.title = 'Untitled';
			}
			const new_path = path + folder.title;
			this.startFolders.push({ key: folder.id, value: folder.id, label: new_path, val: folder.title });
			if (folder.children) this.addOptions(folder.children, `${new_path}/`);
		}
	}
}

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			noteIds = noteIds || context.state.selectedNoteIds;

			const folders: any[] = await Folder.sortFolderTree();
			const options = new AddOptions();
			options.addOptions(folders, '');

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
