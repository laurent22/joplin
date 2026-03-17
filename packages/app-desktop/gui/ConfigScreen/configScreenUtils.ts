import { AppType, SettingItem } from '@joplin/lib/models/Setting';

export const settingMatchesSearch = (md: Pick<SettingItem, 'label' | 'description'>, searchQuery: string): boolean => {
	if (!searchQuery) return true;

	const q = searchQuery.trim().toLowerCase();
	if (!q) return true;

	const labelText = md.label ? md.label() : '';
	const descriptionText = md.description ? md.description(AppType.Desktop) : '';

	const label = String(labelText || '').toLowerCase();
	const description = String(descriptionText || '').toLowerCase();

	return label.includes(q) || description.includes(q);
};
