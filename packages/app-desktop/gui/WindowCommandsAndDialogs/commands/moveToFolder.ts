import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Folder, { FolderEntityWithChildren } from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import BaseItem from '@joplin/lib/models/BaseItem';
import { ModelType } from '@joplin/lib/BaseModel';
import Logger from '@joplin/utils/Logger';
import shim from '@joplin/lib/shim';

const logger = Logger.create('commands/moveToFolder');

export const declaration: CommandDeclaration = {
	name: 'moveToFolder',
	label: () => _('Move to notebook'),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, itemIds: string[] = null) => {
			itemIds = itemIds || context.state.selectedNoteIds;

			let allAreFolders = true;
			const itemIdToType = new Map<string, ModelType>();
			for (const id of itemIds) {
				const item = await BaseItem.loadItemById(id);
				itemIdToType.set(id, item.type_);

				if (item.type_ !== ModelType.Folder) {
					allAreFolders = false;
				}
			}

			const folders = await Folder.sortFolderTree();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			const startFolders: any[] = [];
			const maxDepth = 15;

			// It's okay for folders (but not notes) to have no parent folder:
			if (allAreFolders) {
				startFolders.push({
					key: '',
					value: '',
					label: _('None'),
					indentDepth: 0,
				});
			}

			const addOptions = (folders: FolderEntityWithChildren[], depth: number) => {
				for (let i = 0; i < folders.length; i++) {
					const folder = folders[i];

					// Disallow making a folder a subfolder of itself.
					if (itemIdToType.has(folder.id)) {
						continue;
					}

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
							try {
								const targetFolderId = answer.value;
								for (const id of itemIds) {
									if (id === targetFolderId) {
										continue;
									}

									const itemType = itemIdToType.get(id);
									if (itemType === ModelType.Note) {
										await Note.moveToFolder(id, targetFolderId);
									} else if (itemType === ModelType.Folder) {
										await Folder.moveToFolder(id, targetFolderId);
									} else {
										throw new Error(`Cannot move item with type ${itemType}`);
									}
								}
							} catch (error) {
								logger.error('Error moving items', error);
								void shim.showMessageBox(`Error: ${error}`);
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
