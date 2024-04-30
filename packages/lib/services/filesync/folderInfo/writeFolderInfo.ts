import { join } from 'path';
import { FolderInfo, folderInfoFileName } from '.';
import shim from '../../../shim';
import * as yaml from 'js-yaml';

const writeFolderInfo = async (folderPath: string, folderInfo: FolderInfo): Promise<void> => {
	const folderInfoPath = join(folderPath, folderInfoFileName);
	const folderInfoYaml = yaml.dump(folderInfo);
	await shim.fsDriver().writeFile(folderInfoPath, folderInfoYaml, 'utf8');
};
export default writeFolderInfo;
