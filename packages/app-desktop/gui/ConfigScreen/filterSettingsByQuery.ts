import { AppType } from '@joplin/lib/models/Setting';


interface SettingMetadata {
	key: string;
	label?: string | ((appType: AppType)=> string);
	description?: string | ((appType: AppType)=> string);
	advanced?: boolean;
}

export interface SettingSection {
	name: string;
	metadatas: SettingMetadata[];
}

const filterSettingsByQuery = (
	sections: SettingSection[],
	query: string,
	appType: AppType,
): string[] => {
	const matchedKeys: string[] = [];
	for (const section of sections) {
		for (const md of section.metadatas) {
			const label = (typeof md.label === 'function' ? md.label(appType) : md.label) || '';
			const desc = (typeof md.description === 'function' ? md.description(appType) : md.description) || '';
			if (label.toLowerCase().includes(query.toLowerCase()) || desc.toLowerCase().includes(query.toLowerCase())) {
				matchedKeys.push(md.key);
			}
		}
	}
	return matchedKeys;
};

export default filterSettingsByQuery;
