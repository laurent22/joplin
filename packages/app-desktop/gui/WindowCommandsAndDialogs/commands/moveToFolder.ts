import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import Folder from '@joplin/lib/models/Folder';
import Note from '@joplin/lib/models/Note';
import BaseItem from '@joplin/lib/models/BaseItem';
import { ModelType } from '@joplin/lib/BaseModel';
import Logger from '@joplin/utils/Logger';
import shim from '@joplin/lib/shim';
import showFolderPicker from '../utils/showFolderPicker';

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

			const targetFolderId = await showFolderPicker(comp, {
				label: _('Move to notebook:'),
				// It's okay for folders (but not notes) to have no parent folder:
				allowSelectNone: allAreFolders,
				// Don't allow setting a folder as its own parent
				showFolder: (folder) => !itemIdToType.has(folder.id),
			});

			// It's important to allow the case where targetFolderId is the empty string,
			// since that corresponds to the toplevel notebook.
			if (targetFolderId !== null) {
				try {
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
		},
		enabledCondition: 'someNotesSelected && !noteIsReadOnly',
	};
};
