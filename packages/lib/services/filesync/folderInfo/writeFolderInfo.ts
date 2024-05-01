import { join } from 'path';
import { FolderInfo, folderInfoFileName } from '.';
import shim from '../../../shim';
import * as yaml from 'js-yaml';

const writeFolderInfo = async (folderPath: string, folderInfo: FolderInfo): Promise<void> => {
	const folderInfoPath = join(folderPath, folderInfoFileName);

	folderInfo = { ...folderInfo };
	if (folderInfo.icon === '') {
		delete folderInfo.icon;
	}

	const fieldOrder = ['title', 'id', 'icon'];
	const folderInfoYaml = yaml.dump(
		folderInfo,
		{ sortKeys: (a, b) => fieldOrder.indexOf(a) - fieldOrder.indexOf(b) },
	);
	await shim.fsDriver().writeFile(folderInfoPath, folderInfoYaml, 'utf8');
};
export default writeFolderInfo;
