export function matchesSearchQueryValue(query: string, relatedText: string|string[], sectionTitle = ''): boolean {
	const searchThrough = Array.isArray(relatedText) ? relatedText.join('\n') : relatedText;
	const normalizedQuery = (query ?? '').toLocaleLowerCase().trim();
	const hasSearchMatches = sectionTitle.toLocaleLowerCase() === normalizedQuery || searchThrough.toLocaleLowerCase().includes(normalizedQuery);
	return normalizedQuery.length > 0 && hasSearchMatches;
}

export function encryptionSearchKeywords(encryptionEnabled: boolean, translate: (input: string)=> string): string[] {
	return [
		translate('End-to-end encryption'),
		encryptionEnabled ? translate('Disable encryption') : translate('Enable encryption'),
	];
}
