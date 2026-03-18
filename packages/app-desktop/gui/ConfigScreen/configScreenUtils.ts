import * as React from 'react';

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

const regexSpecialCharacters = /[.*+?^${}()|[\]\\]/g;

export const highlightSearchMatches = (text: string, searchQuery: string): React.ReactNode => {
	const query = (searchQuery || '').trim();
	if (!query.length || !text) return text;

	const safeQuery = query.replace(regexSpecialCharacters, '\\$&');
	const regexp = new RegExp(`(${safeQuery})`, 'ig');
	const splitText = text.split(regexp);

	return splitText.map((part, index) => {
		if (!part) return null;
		const isMatch = part.toLocaleLowerCase() === query.toLocaleLowerCase();
		if (!isMatch) return React.createElement(React.Fragment, { key: index }, part);
		return React.createElement('mark', { key: index }, part);
	});
};

export default matchesSearchQuery;
