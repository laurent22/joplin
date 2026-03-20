import Setting, { AppType, SettingItem, SettingMetadataSection } from '../../../models/Setting';

// Platform-agnostic query normalization for config search.
export const normalizeQuery = (query: string): string => {
	return query.trim().toLowerCase();
};

// Returns true when query has non-whitespace characters after normalization.
export const hasNormalizedQuery = (query: string): boolean => {
	return !!normalizeQuery(query);
};

// Normalized string equality check used by cross-platform search UI layers.
export const equalsNormalizedQuery = (query: string, value: string): boolean => {
	const normalizedQuery = normalizeQuery(query);
	if (!normalizedQuery) return false;

	return normalizeQuery(value) === normalizedQuery;
};

// Normalized substring check used by cross-platform search UI layers.
export const includesNormalizedQuery = (query: string, value: string): boolean => {
	const normalizedQuery = normalizeQuery(query);
	if (!normalizedQuery) return false;

	return normalizeQuery(value).includes(normalizedQuery);
};

// Matches config metadata text against a normalized query.
export const isMetadataMatched = (
	query: string,
	section: SettingMetadataSection,
	metadata: SettingItem,
	appType: AppType,
): boolean => {
	const normalizedQuery = normalizeQuery(query);
	if (!normalizedQuery) return true;

	const metadataLabel = metadata.label ? metadata.label() : '';
	const metadataDescription = metadata.description ? metadata.description(appType) : '';
	const sectionLabel = Setting.sectionNameToLabel(section.name);

	const normalizedCandidates = [
		sectionLabel,
		metadataLabel,
		metadataDescription,
	];

	return normalizedCandidates.some(value => includesNormalizedQuery(normalizedQuery, value || ''));
};

export interface SearchResultGroup {
	sectionName: string;
	matchingKeys: string[];
}

export interface MatchedSearchSection {
	section: SettingMetadataSection;
	matchingKeys: string[];
}

// Computes grouped search hits from section metadata.
export const searchResultGroups = (
	query: string,
	sections: SettingMetadataSection[],
	appType: AppType,
): SearchResultGroup[] => {
	const normalizedQuery = normalizeQuery(query);
	if (!normalizedQuery) return [];

	const output: SearchResultGroup[] = [];

	for (const section of sections) {
		const sectionTitleMatched = includesNormalizedQuery(normalizedQuery, Setting.sectionNameToLabel(section.name));

		if (sectionTitleMatched && section.isScreen) {
			output.push({
				sectionName: section.name,
				matchingKeys: [],
			});
			continue;
		}

		const matchingKeys: string[] = [];

		for (const metadata of section.metadatas) {
			if (!metadata.key) continue;

			if (sectionTitleMatched || isMetadataMatched(normalizedQuery, section, metadata, appType)) {
				matchingKeys.push(metadata.key);
			}
		}

		if (!matchingKeys.length) continue;

		output.push({
			sectionName: section.name,
			matchingKeys,
		});
	}

	return output;
};

// Maps grouped search hits back to concrete section metadata for rendering.
export const matchedSearchSections = (
	sections: SettingMetadataSection[],
	groups: SearchResultGroup[],
): MatchedSearchSection[] => {
	if (!groups.length) return [];

	const sectionByName: Record<string, SettingMetadataSection> = {};

	for (const section of sections) {
		sectionByName[section.name] = section;
	}

	const output: MatchedSearchSection[] = [];

	for (const group of groups) {
		const section = sectionByName[group.sectionName];
		if (!section) continue;

		const matchingKeySet = new Set(group.matchingKeys);
		const metadatas = section.metadatas.filter(metadata => metadata.key && matchingKeySet.has(metadata.key));
		if (!metadatas.length && !section.isScreen) continue;

		output.push({
			section: {
				...section,
				metadatas,
			},
			matchingKeys: group.matchingKeys,
		});
	}

	return output;
};
