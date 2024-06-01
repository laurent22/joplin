import { basename, dirname, extname, join, normalize } from 'path';
import { FolderItem } from '../types';
import loadFolderInfo from './folderInfo/loadFolderInfo';
import Folder from '../../../models/Folder';
import { FolderEntity } from '../../database/types';
import { ModelType } from '../../../BaseModel';
import shim from '../../../shim';
import { parse as parseFrontMatter } from '../../../utils/frontMatter';
import Note from '../../../models/Note';
import { Stat } from '../../../fs-driver-base';
import ItemTree from '../ItemTree';
import { resourceMetadataExtension, resourcesDirItem, resourcesDirName } from '../constants';
import loadResourceMetadata from './loadResourceMetadata';

const statToItem = async (baseFolderPath: string, stat: Stat, remoteTree: ItemTree): Promise<FolderItem|null> => {
	const base: FolderItem = {
		updated_time: stat.mtime.getTime(),
	};
	const path = stat.path;
	const parentPath = normalize(dirname(path));
	if (remoteTree.hasPath(parentPath)) {
		base.parent_id = remoteTree.idAtPath(parentPath);
	} else if (parentPath === '.') {
		base.parent_id = remoteTree.idAtPath('.');
	}

	const extension = extname(path);

	const isResource = parentPath === resourcesDirName && !path.endsWith(resourceMetadataExtension);
	const isNote = !isResource && ['.md', '.html'].includes(extension);
	const isFolder = stat.isDirectory();

	let result: FolderItem;
	if (isFolder) {
		if (path === resourcesDirName) {
			// Virtual resources directory -- handle differently.
			result = { ...resourcesDirItem, parent_id: base.parent_id };
		} else {
			const folderInfo = await loadFolderInfo(join(baseFolderPath, path));
			if (folderInfo.id && !await Folder.load(folderInfo.id)) {
				delete folderInfo.id;
			}
			const item: FolderEntity = {
				...base,
				title: folderInfo.title,
				type_: ModelType.Folder,
			};
			if (folderInfo.folder_info_updated) {
				item.updated_time = Math.max(folderInfo.folder_info_updated, item.updated_time);
			}
			if (folderInfo.id) {
				item.id = folderInfo.id;
			}
			if (folderInfo.icon) {
				item.icon = folderInfo.icon;
			}
			result = item;
		}
	} else if (isResource) {
		// Metadata files are processed separately.
		if (extension === resourceMetadataExtension) {
			return null;
		}

		const metadata = await loadResourceMetadata(join(baseFolderPath, path));

		result = {
			...base,
			...metadata,

			type_: ModelType.Resource,
		};
	} else if (isNote) {
		const fileContent = await shim.fsDriver().readFile(join(baseFolderPath, stat.path), 'utf8');
		const { metadata } = parseFrontMatter(fileContent);

		result = {
			// These properties need to be present to allow comparisons to work correctly.
			is_todo: 0,
			todo_completed: 0,

			...base,
			...metadata,

			// Use || to handle the case where the title is empty, which can happen for empty
			// frontmatter.
			title: metadata.title || basename(stat.path, extension),
			body: await Note.replaceResourceExternalToInternalLinks(metadata.body ?? ''),

			type_: ModelType.Note,
		};
	} else {
		result = null;
	}

	return result;
};

export default statToItem;
