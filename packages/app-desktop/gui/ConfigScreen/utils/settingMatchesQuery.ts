const normalizeSearchText = (text: string) => {
	return text.toLocaleLowerCase().trim();
};

const toSearchText = (relatedText: string|string[]) => {
	if (Array.isArray(relatedText)) return relatedText.join('\n');
	return relatedText;
};

export const settingMatchesQuery = (query: string, relatedText: string|string[], sectionTitle = '') => {
	const normalizedQuery = normalizeSearchText(query);
	if (!normalizedQuery) return false;

	const normalizedSectionTitle = normalizeSearchText(sectionTitle);
	const normalizedRelatedText = normalizeSearchText(toSearchText(relatedText));

	return normalizedSectionTitle === normalizedQuery || normalizedRelatedText.includes(normalizedQuery);
};

export const filterItemsByQuery = <T>(
	items: T[],
	query: string,
	getRelatedText: (item: T)=> string|string[],
	getSectionTitle: (item: T)=> string = () => '',
) => {
	if (!normalizeSearchText(query)) return items;

	return items.filter(item => settingMatchesQuery(query, getRelatedText(item), getSectionTitle(item)));
};
