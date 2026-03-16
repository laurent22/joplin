const matchesSearchQuery = (
	searchQuery: string,
	sectionTitle: string,
	relatedText: string|string[],
): boolean => {
	const query = searchQuery.toLocaleLowerCase().trim();
	if (!query.length) return false;
	const textToSearch = (Array.isArray(relatedText) ? relatedText.join('\n') : relatedText).toLocaleLowerCase();
	return sectionTitle.toLocaleLowerCase().includes(query) || textToSearch.includes(query);
};

export default matchesSearchQuery;
