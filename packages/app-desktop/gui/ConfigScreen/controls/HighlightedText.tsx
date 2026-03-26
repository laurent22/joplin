import * as React from 'react';

interface Props {
	text: string;
	highlight: string;
}

export default function HighlightedText(props: Props) {
	const { text, highlight } = props;

	if (!highlight) {
		return <>{text}</>;
	}

	const parts: Array<{ text: string; highlighted: boolean }> = [];
	const query = highlight.toLowerCase();
	let currentIndex = 0;
	let matchIndex = text.toLowerCase().indexOf(query);

	while (matchIndex !== -1) {
		if (matchIndex > currentIndex) {
			parts.push({
				text: text.substring(currentIndex, matchIndex),
				highlighted: false,
			});
		}
		parts.push({
			text: text.substring(matchIndex, matchIndex + query.length),
			highlighted: true,
		});
		currentIndex = matchIndex + query.length;
		matchIndex = text.toLowerCase().indexOf(query, currentIndex);
	}

	if (currentIndex < text.length) {
		parts.push({
			text: text.substring(currentIndex),
			highlighted: false,
		});
	}

	return (
		<>
			{parts.map((part, index) =>
				part.highlighted ? (
					<span
						key={index}
						style={{
							backgroundColor: '#ffeb3b',
							padding: '2px',
						}}
					>
						{part.text}
					</span>
				) : (
					<span key={index}>{part.text}</span>
				)
			)}
		</>
	);
}
