import Folder, { FolderEntityWithChildren } from '@joplin/lib/models/Folder';
import { WindowControl } from './useWindowControl';
import { _ } from '@joplin/lib/locale';
import { FolderEntity } from '@joplin/lib/services/database/types';

interface FolderEntry {
	key: string;
	value: string;
	label: string;
	indentDepth: number;
}

interface Options {
	label: string;
	allowSelectNone: boolean;
	showFolder: (entity: FolderEntity)=> boolean;
}

const showFolderPicker = async (control: WindowControl, { label, allowSelectNone, showFolder }: Options) => {
	const folders = await Folder.sortFolderTree();
	const startFolders: FolderEntry[] = [];
	const maxDepth = 15;

	if (allowSelectNone) {
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

			if (!showFolder(folder)) {
				continue;
			}

			startFolders.push({ key: folder.id, value: folder.id, label: folder.title, indentDepth: depth });
			if (folder.children) addOptions(folder.children, (depth + 1) < maxDepth ? depth + 1 : maxDepth);
		}
	};

	addOptions(folders, 0);

	const folderId = await control.showPrompt({
		label,
		value: '',
		suggestions: startFolders,
	});
	return folderId;
};

export default showFolderPicker;
