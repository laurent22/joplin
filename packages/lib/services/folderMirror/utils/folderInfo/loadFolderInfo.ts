import { basename, join } from 'path';
import { FolderInfo, folderInfoFileName } from '.';
import shim from '../../../../shim';
import * as yaml from 'js-yaml';
import uuid from '../../../../uuid';
import parseFolderIcon from './parseFolderIcon';

const loadFolderInfo = async (folderPath: string): Promise<FolderInfo> => {
	const folderInfoPath = join(folderPath, folderInfoFileName);
	let title = basename(folderPath);

	if (!await shim.fsDriver().exists(folderInfoPath)) {
		return {
			id: uuid.create(),
			title,
			icon: '',
		};
	}

	const folderInfoSerialized = await shim.fsDriver().readFile(folderInfoPath, 'utf8');
	const folderInfo = yaml.load(folderInfoSerialized);
	if (typeof folderInfo !== 'object') {
		throw new Error('Wrong folder info format. Expected YAML object.');
	}

	if (!('id' in folderInfo) || typeof folderInfo.id !== 'string') {
		throw new Error(`${folderInfoPath} should be a YAML file with a string id property.`);
	}

	if ('title' in folderInfo && typeof folderInfo.title === 'string') {
		title = folderInfo.title;
	}

	let icon = '';
	if (('icon' in folderInfo)) {
		if (typeof folderInfo.icon !== 'string') {
			throw new Error(`${folderInfoPath} has an icon property that is not a string.`);
		}

		icon = JSON.stringify(parseFolderIcon(folderInfo.icon));
	}

	const folderInfoStats = await shim.fsDriver().stat(folderInfoPath);

	return {
		id: folderInfo.id,
		title,
		icon,
		folder_info_updated: folderInfoStats.mtime.getTime(),
	};
};

export default loadFolderInfo;
