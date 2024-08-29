import { dirname } from 'path';
import { itemDiffFields } from '../constants';
import keysMatch from './keysMatch';
import debugLogger from './debugLogger';
import ItemTree, { ActionListeners, noOpActionListeners } from '../ItemTree';
import { ModelType } from '../../../BaseModel';
import BaseItem from '../../../models/BaseItem';

const mergeTrees = async (localTree: ItemTree, remoteTree: ItemTree, modifyLocal: ActionListeners, modifyRemote: ActionListeners) => {
	const handledIds = new Set<string>();
	for (const [localPath, localItem] of localTree.items()) {
		if (handledIds.has(localItem.id)) continue;

		const id = localItem.id;

		if (remoteTree.hasId(id)) {
			const remoteItem = remoteTree.getAtId(id);
			const remotePath = remoteTree.pathFromId(id);

			if (!keysMatch(localItem, remoteItem, itemDiffFields)) {
				if (localItem.updated_time > remoteItem.updated_time) {
					await remoteTree.updateAtPath(remotePath, localItem, modifyRemote);
				} else {
					await localTree.updateAtPath(localPath, remoteItem, modifyLocal);
				}
			}

			// Because folders can have children, it's more important to keep their paths up-to-date.
			const isRenamedFolder = remotePath !== localPath && localItem.type_ === ModelType.Folder;
			if (dirname(remotePath) !== dirname(localPath) || isRenamedFolder) {
				if (localItem.updated_time >= remoteItem.updated_time) {
					debugLogger.debug('moveRemote', remotePath, '->', localPath);
					await remoteTree.move(remotePath, localPath, modifyRemote);
				} else {
					debugLogger.debug('moveLocal', localPath, '->', remotePath);
					await localTree.move(localPath, remotePath, modifyLocal);
				}
			}

			if (localItem.deleted_time && remoteItem) {
				await remoteTree.deleteAtPath(remotePath, modifyRemote);
				await localTree.deleteAtPath(localPath, noOpActionListeners);
			}
		} else if (!localItem.deleted_time) {
			debugLogger.debug('Add local item to remote:', localPath);
			// Add to the parent -- handles the case where an item with localPath already
			// exists in the remote.
			const localParentPath = dirname(localPath);
			await remoteTree.addItemTo(localParentPath, localItem, modifyRemote);
		}

		handledIds.add(localItem.id);
	}

	for (const [path, remoteItem] of remoteTree.items()) {
		if (handledIds.has(remoteItem.id)) continue;

		debugLogger.debug('found unhandled remote ID', remoteItem.id, `(title: ${remoteItem.title} at ${path})`);
		debugLogger.group();

		const itemExists = !!await BaseItem.loadItemById(remoteItem.id);
		const inLocalTree = localTree.hasId(remoteItem.id);
		debugLogger.debug('Exists', itemExists, 'inLocal', inLocalTree);

		if (itemExists && !inLocalTree) {
			// If the note does exist, but isn't in the local tree, it was moved out of the
			// mirrored folder.
			await remoteTree.deleteAtPath(path, modifyRemote);
		} else if (!inLocalTree) {
			await localTree.processItem(path, remoteItem, modifyLocal);
		} else {
			localTree.checkRep_();
			remoteTree.checkRep_();
			throw new Error('Item is in local tree but was not processed by the first pass. Was the item added during the sync (while also matching the ID in the remote folder)?');
		}

		debugLogger.groupEnd();
	}
};

export default mergeTrees;
