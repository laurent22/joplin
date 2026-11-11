import Setting, { AppType, SettingItem, SettingMetadataSection } from '@joplin/lib/models/Setting';
import { includesNormalizedQuery, normalizeQuery } from '@joplin/lib/components/shared/config/config-search-text';

const isMetadataMatched = (
	normalizedQuery: string,
	section: SettingMetadataSection,
	metadata: SettingItem,
	appType: AppType,
): boolean => {
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
