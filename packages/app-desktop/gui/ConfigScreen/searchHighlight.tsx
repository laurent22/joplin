import * as React from 'react';

const escapeRegExp = (value: string): string => {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const highlightSearchText = (
	text: string,
	query: string,
	markStyle?: React.CSSProperties,
): React.ReactNode => {
	if (!text) return text;

	const trimmedQuery = query.trim();
	if (!trimmedQuery) return text;

	const matcher = new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'ig');
	const parts = text.split(matcher);
	if (parts.length === 1) return text;

	return parts.map((part, index) => {
		if (index % 2 === 1) {
			return <mark key={`highlight-${index}`} style={markStyle}>{part}</mark>;
		}

		return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
	});
};

export default highlightSearchText;
