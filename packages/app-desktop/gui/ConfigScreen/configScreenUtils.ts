import * as React from 'react';
import { AppType, SettingItem } from '@joplin/lib/models/Setting';

const normalizedQuery = (searchQuery: string): string => {
	return String(searchQuery || '').trim().toLowerCase();
};

const searchTerms = (searchQuery: string): string[] => {
	const q = normalizedQuery(searchQuery);
	if (!q) return [];

	const terms = q.split(/\s+/).filter(Boolean);
	// Longer terms first avoids a shorter term consuming a longer intended match.
	terms.sort((a, b) => b.length - a.length);
	return terms;
};

const normalizeText = (text: string|undefined): string => {
	return String(text || '').toLowerCase();
};

const textMatchesSearch = (text: string|undefined, searchQuery: string): boolean => {
	const q = normalizedQuery(searchQuery);
	if (!q) return true;
	return normalizeText(text).includes(q);
};

interface SettingMatchesSearchOptions {
	searchQuery: string;
	sectionTitle?: string;
	extraTexts?: string[];
}

export const settingMatchesSearch = (md: Pick<SettingItem, 'label' | 'description'>, options: SettingMatchesSearchOptions): boolean => {
	const q = normalizedQuery(options.searchQuery);
	if (!q) return true;

	if (textMatchesSearch(options.sectionTitle, q)) return true;

	const labelText = md.label ? md.label() : '';
	const descriptionText = md.description ? md.description(AppType.Desktop) : '';

	if (textMatchesSearch(labelText, q)) return true;
	if (textMatchesSearch(descriptionText, q)) return true;

	for (const text of options.extraTexts || []) {
		if (textMatchesSearch(text, q)) return true;
	}

	return false;
};

export const highlightSearchText = (text: string, searchQuery: string): React.ReactNode => {
	const source = String(text || '');
	const terms = searchTerms(searchQuery);
	if (!terms.length || !source) return source;

	const sourceLower = source.toLowerCase();
	const chunks: React.ReactNode[] = [];
	let searchStart = 0;

	while (searchStart < source.length) {
		let index = -1;
		let term = '';

		for (const currentTerm of terms) {
			const currentIndex = sourceLower.indexOf(currentTerm, searchStart);
			if (currentIndex < 0) continue;
			if (index < 0 || currentIndex < index) {
				index = currentIndex;
				term = currentTerm;
			}
		}

		if (index < 0) {
			chunks.push(source.slice(searchStart));
			break;
		}

		if (index > searchStart) {
			chunks.push(source.slice(searchStart, index));
		}

		const end = index + term.length;
		chunks.push(React.createElement('mark', {
			key: `${index}-${end}`,
			className: 'config-search-highlight',
		}, source.slice(index, end)));
		searchStart = end;
	}

	if (!chunks.length) return source;
	return React.createElement(React.Fragment, null, ...chunks);
};

export const searchQueryIsEmpty = (searchQuery: string): boolean => {
	return !normalizedQuery(searchQuery);
};

export default settingMatchesSearch;
