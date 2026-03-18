import * as React from 'react';
import { splitSearchMatches } from './searchUtils';

interface Props {
	text: string;
	searchQuery: string;
}

const HighlightedSearchText: React.FC<Props> = props => {
	const parts = splitSearchMatches(props.searchQuery, props.text);

	return (
		<>
			{parts.map((part, index) => {
				if (part.isMatch) {
					return <mark key={index} className='config-search-highlight'>{part.value}</mark>;
				}

				return <React.Fragment key={index}>{part.value}</React.Fragment>;
			})}
		</>
	);
};

export default HighlightedSearchText;
