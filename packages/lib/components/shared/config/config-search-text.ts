// Platform-agnostic text helpers for config search (desktop + mobile).
export const normalizeQuery = (query: string): string => {
	return query.trim().toLowerCase();
};

export const hasNormalizedQuery = (query: string): boolean => {
	return !!normalizeQuery(query);
};

export const toSearchText = (input: string|string[]|null|undefined): string => {
	if (Array.isArray(input)) return input.join('\n');
	if (typeof input === 'string') return input;
	return '';
};

export const equalsNormalizedQuery = (query: string, value: string): boolean => {
	const normalizedQuery = normalizeQuery(query);
	if (!normalizedQuery) return false;

	return normalizeQuery(value) === normalizedQuery;
};

export const includesNormalizedQuery = (query: string, value: string): boolean => {
	const normalizedQuery = normalizeQuery(query);
	if (!normalizedQuery) return false;

	return normalizeQuery(value).includes(normalizedQuery);
};

// Shared visibility predicate used by UI integration layers.
export const shouldShowBySearch = (
	query: string,
	sectionTitle: string,
	relatedText: string|string[]|null|undefined,
): boolean => {
	if (!hasNormalizedQuery(query)) return false;

	return (
		includesNormalizedQuery(query, sectionTitle)
		|| includesNormalizedQuery(query, toSearchText(relatedText))
	);
};
