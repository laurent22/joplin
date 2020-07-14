import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
const Folder = require('lib/models/Folder');
const Note = require('lib/models/Note');
const { _ } = require('lib/locale');

export const declaration:CommandDeclaration = {
	name: 'moveToFolder',
	label: () => _('Move to notebook'),
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ noteIds }:any) => {
			const folders:any[] = await Folder.sortFolderTree();
			const startFolders:any[] = [];
			const maxDepth = 15;

			const addOptions = (folders:any[], depth:number) => {
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
					onClose: async (answer:any) => {
						if (answer != null) {
							for (let i = 0; i < noteIds.length; i++) {
								await Note.moveToFolder(noteIds[i], answer.value);
							}
						}
						comp.setState({ promptOptions: null });
					},
				},
			});
		},
		isEnabled: (props:any):boolean => {
			return !!props.noteIds.length;
		},
		mapStateToProps: (state:any):any => {
			return {
				noteIds: state.selectedNoteIds,
			};
		},
	};
};
