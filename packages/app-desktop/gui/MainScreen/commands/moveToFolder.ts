import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';

export const declaration: CommandDeclaration = {
	name: 'moveToFolder',
	label: () => _('Move to notebook'),
};

export interface folderObj {
	id?:string,
	title:string
	icon?:string,
	children?:string
}

export interface folderDetailsObj {
	emoji:string,
	dataUrl:string
}

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			noteIds = noteIds || context.state.selectedNoteIds;

			const folders: any[] = await Folder.sortFolderTree();
			const startFolders: any[] = [];
			const maxDepth = 15;

			const getFolderJsonData = (folder:folderObj, folderDetails:folderDetailsObj):string => {
				if(folderDetails.emoji){
					return (`${folderDetails.emoji}  ${folder.title}`);
				}else if(!!folderDetails.dataUrl){
					return (`<div className="verticallyCenter">  <img className="MoveToNotebookCustomImageMargin" src=${folderDetails.dataUrl} height="20" width="20" alt="country-image"/> <span>${folder.title}</span>  </div>`);
				}else{
					return (`📁  ${folder.title}`);
				}
			}

			const addOptions = (folders: any[], depth: number) => {
				for (let i = 0; i < folders.length; i++) {
					const folder = folders[i];
					const folderDetails = folder.icon && JSON.parse(folder.icon);
					startFolders.push({ key: folder.id, value: folder.id, label: folder.icon ? getFolderJsonData(folder,folderDetails) :  `📁  ${folder.title}` , indentDepth: depth });
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
