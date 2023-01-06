import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry';
import shim from '@joplin/lib/shim';

export const autosaveFilename = 'autosaved-drawing.joplin.svg';

export const getAutosaveFilepath = () => {
	return `${Setting.value('resourceDir')}/${autosaveFilename}`;
};

export const writeAutosave = async (data: string) => {
	const filePath = getAutosaveFilepath();
	reg.logger().info('Auto-saving drawing to %s', filePath);

	await shim.fsDriver().writeFile(filePath, data, 'utf8');
};

export const readAutosave = async (): Promise<string|null> => {
	return await shim.fsDriver().readFile(getAutosaveFilepath());
};

export const clearAutosave = async () => {
	await shim.fsDriver().remove(getAutosaveFilepath());
};
