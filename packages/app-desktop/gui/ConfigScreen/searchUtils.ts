export const normalizeSearchString = (value: unknown): string => {
	return `${value ?? ''}`.toLocaleLowerCase();
};

export const settingMatchesSearch = (query: string, label: unknown, description: unknown): boolean => {
	const normalizedQuery = query.toLocaleLowerCase().trim();
	if (!normalizedQuery) return true;

	const normalizedLabel = normalizeSearchString(label);
	const normalizedDescription = normalizeSearchString(description);

	return normalizedLabel.includes(normalizedQuery) || normalizedDescription.includes(normalizedQuery);
};

export const sectionLabelMatchesSearch = (query: string, sectionLabel: string): boolean => {
	const normalizedQuery = query.toLocaleLowerCase().trim();
	if (!normalizedQuery) return false;
	return sectionLabel.toLocaleLowerCase().includes(normalizedQuery);
};
