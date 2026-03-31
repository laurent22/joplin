import { AppType, SettingMetadataSection } from '@joplin/lib/models/Setting';

// Returns a copy of sections filtered to only include metadatas matching the search query.
// Sections with no matching metadatas and screen-based sections are excluded.
const filterSettingsBySearchQuery = (sections: SettingMetadataSection[], query: string, device: AppType): SettingMetadataSection[] => {
	const q = query.toLowerCase().trim();
	if (!q) return sections;

	return sections
		.filter(section => !section.isScreen)
		.map(section => ({
			...section,
			metadatas: section.metadatas.filter(md => {
				const label = md.label ? md.label().toLowerCase() : '';
				const description = md.description ? md.description(device).toLowerCase() : '';
				return label.includes(q) || description.includes(q) || (md.key || '').toLowerCase().includes(q);
			}),
		}))
		.filter(section => section.metadatas.length > 0);
};

export default filterSettingsBySearchQuery;
