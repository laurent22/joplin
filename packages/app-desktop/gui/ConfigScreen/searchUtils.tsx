import * as React from 'react';

export function matchesSearchQueryValue(query: string, relatedText: string|string[], sectionTitle = ''): boolean {
	const searchThrough = Array.isArray(relatedText) ? relatedText.join('\n') : relatedText;
	const normalizedQuery = (query ?? '').toLocaleLowerCase().trim();
	if (normalizedQuery.length === 0) return false;
	const sectionLower = sectionTitle.toLocaleLowerCase();
	const textLower = searchThrough.toLocaleLowerCase();
	return (
		(!!sectionLower && sectionLower.includes(normalizedQuery)) ||
		(!!textLower && textLower.includes(normalizedQuery))
	);
}

// Returns the text with every occurrence of `query` wrapped in a <mark> element.
export function highlightText(text: string, query: string): React.ReactNode {
	if (!text || !query.trim()) return text;
	const q = query.toLocaleLowerCase().trim();
	const lower = text.toLocaleLowerCase();
	const parts: React.ReactNode[] = [];
	let last = 0;
	let idx = lower.indexOf(q);
	while (idx !== -1) {
		if (idx > last) parts.push(text.slice(last, idx));
		parts.push(
			<mark key={`h${idx}`} className='search-highlight'>
				{text.slice(idx, idx + q.length)}
			</mark>,
		);
		last = idx + q.length;
		idx = lower.indexOf(q, last);
	}
	if (last < text.length) parts.push(text.slice(last));
	if (!parts.length) return text;
	if (parts.length === 1 && typeof parts[0] === 'string') return parts[0];
	return <React.Fragment>{parts}</React.Fragment>;
}

export function encryptionSearchKeywords(encryptionEnabled: boolean, translate: (input: string)=> string): string[] {
	return [
		translate('End-to-end encryption'),
		encryptionEnabled ? translate('Disable encryption') : translate('Enable encryption'),
	];
}
