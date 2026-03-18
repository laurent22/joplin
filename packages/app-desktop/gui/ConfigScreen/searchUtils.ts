export const normalizeSearchString = (value: unknown): string => {
	return `${value ?? ''}`.toLocaleLowerCase();
};

export interface SearchMatchPart {
	value: string;
	isMatch: boolean;
}

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

export const splitSearchMatches = (query: string, value: unknown): SearchMatchPart[] => {
	const text = `${value ?? ''}`;
	const normalizedQuery = query.toLocaleLowerCase().trim();

	if (!normalizedQuery) {
		return [{ value: text, isMatch: false }];
	}

	const normalizedText = text.toLocaleLowerCase();
	const output: SearchMatchPart[] = [];
	let startIndex = 0;

	while (startIndex < text.length) {
		const matchIndex = normalizedText.indexOf(normalizedQuery, startIndex);

		if (matchIndex < 0) {
			output.push({ value: text.slice(startIndex), isMatch: false });
			break;
		}

		if (matchIndex > startIndex) {
			output.push({ value: text.slice(startIndex, matchIndex), isMatch: false });
		}

		const nextIndex = matchIndex + normalizedQuery.length;
		output.push({ value: text.slice(matchIndex, nextIndex), isMatch: true });
		startIndex = nextIndex;
	}

	if (!output.length) {
		return [{ value: text, isMatch: false }];
	}

	return output;
};
