import shim from '../../../shim';
import ItemTree, { AddActionListener } from '../ItemTree';
import debugLogger from './debugLogger';
import statToItem from './statToItem';


const fillRemoteTree = async (baseFolderPath: string, remoteTree: ItemTree, addItemHandler: AddActionListener) => {
	const stats = await shim.fsDriver().readDirStats(baseFolderPath, { recursive: true });

	// Sort so that parent folders are visited before child folders.
	stats.sort((a, b) => a.path.length - b.path.length);

	for (const stat of stats) {
		const item = await statToItem(baseFolderPath, stat, remoteTree);
		if (!item) continue;

		if (remoteTree.hasId(item.id)) {
			debugLogger.warn('Removing ID from item with duplicated ID. Item: ', item.title, item.id, 'at', stat.path);
			delete item.id;
		}

		await remoteTree.addItemAt(stat.path, item, addItemHandler);
	}
};

export default fillRemoteTree;
