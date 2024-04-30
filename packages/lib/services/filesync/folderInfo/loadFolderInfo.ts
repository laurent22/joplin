import { join } from 'path';
import { FolderInfo, folderInfoFileName } from '.';
import shim from '../../../shim';
import * as yaml from 'js-yaml';
import uuid from '../../../uuid';

const loadFolderInfo = async (folderPath: string): Promise<FolderInfo> => {
	const folderInfoPath = join(folderPath, folderInfoFileName);

	if (!await shim.fsDriver().exists(folderInfoPath)) {
		return {
			id: uuid.create(),
			icon: undefined,
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

	let icon: string|undefined = undefined;
	if (('icon' in folderInfo)) {
		if (typeof folderInfo.icon !== 'string') {
			throw new Error(`${folderInfoPath} has an icon property that is not a string.`);
		}
		icon = folderInfo.icon;
	}

	return {
		id: folderInfo.id,
		icon,
	};
};

export default loadFolderInfo;
