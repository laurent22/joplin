import * as React from 'react';
import { escapeRegExp } from '@joplin/lib/string-utils';

// Returns a React node where every case-insensitive match of `query` in `text`
// is wrapped in a `mark` element.
const highlightSearchText = (
	text: string,
	query: string,
): React.ReactNode => {
	if (!text) return text;

	const trimmedQuery = query.trim();
	if (!trimmedQuery) return text;

	const matcher = new RegExp(`(${escapeRegExp(trimmedQuery)})`, 'ig');
	const parts = text.split(matcher);
	if (parts.length === 1) return text;

	return parts.map((part, index) => {
		if (index % 2 === 1) {
			return <mark key={`highlight-${index}`}>{part}</mark>;
		}

		return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
	});
};

export default highlightSearchText;
