export function matchesSearchQueryValue(query: string, relatedText: string|string[], sectionTitle = ''): boolean {
	const searchThrough = Array.isArray(relatedText) ? relatedText.join('\n') : relatedText;
	const normalizedQuery = (query ?? '').toLocaleLowerCase().trim();
	if (normalizedQuery.length === 0) return false;
	const sectionLower = sectionTitle.toLocaleLowerCase();
	const textLower = searchThrough.toLocaleLowerCase();
	const hasSearchMatches =
		(sectionLower && sectionLower.includes(normalizedQuery)) ||
		(sectionLower && normalizedQuery.includes(sectionLower)) ||
		(textLower && textLower.includes(normalizedQuery)) ||
		(textLower && normalizedQuery.includes(textLower));
	return hasSearchMatches;
}

export function encryptionSearchKeywords(encryptionEnabled: boolean, translate: (input: string)=> string): string[] {
	return [
		translate('End-to-end encryption'),
		encryptionEnabled ? translate('Disable encryption') : translate('Enable encryption'),
	];
}
