import * as React from 'react';
import { cleanReleaseNoteLine } from '../../utils/checkForUpdatesUtils';

// Strict discriminated union — each node type carries exactly the data it needs
export type ReleaseNoteNode =
	| { type: 'heading'; level: number; content: string }
	| { type: 'list-item'; content: string }
	| { type: 'paragraph'; content: string }
	| { type: 'hr' };

export const parseReleaseNotes = (markdown: string | null | undefined): ReleaseNoteNode[] => {
	if (!markdown || !markdown.trim()) return [];

	const nodes: ReleaseNoteNode[] = [];

	for (const rawLine of markdown.split('\n')) {
		const line = rawLine.trim();
		if (!line) continue;

		// Horizontal rule: ---, ***, ___
		if (/^[-*_]{3,}$/.test(line)) {
			nodes.push({ type: 'hr' });
			continue;
		}

		// Headings: ## Title
		const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
		if (headingMatch) {
			const content = cleanReleaseNoteLine(headingMatch[2]);
			if (content) nodes.push({ type: 'heading', level: headingMatch[1].length, content });
			continue;
		}

		// List items: - item, * item, + item
		const listMatch = line.match(/^[-*+]\s+(.+)/);
		if (listMatch) {
			const content = cleanReleaseNoteLine(listMatch[1]);
			if (content) nodes.push({ type: 'list-item', content });
			continue;
		}

		// Paragraph
		const content = cleanReleaseNoteLine(line);
		if (content) nodes.push({ type: 'paragraph', content });
	}

	return nodes;
};

interface ReleaseNotesContentProps {
	markdown: string;
}

// Groups consecutive list-item nodes under a single <ul> for valid semantic HTML.
export const ReleaseNotesContent: React.FC<ReleaseNotesContentProps> = ({ markdown }) => {
	const nodes = parseReleaseNotes(markdown);
	if (nodes.length === 0) return null;

	const elements: React.ReactElement[] = [];
	let i = 0;

	while (i < nodes.length) {
		const node = nodes[i];
		const key = `rn-${i}`;

		if (node.type === 'heading') {
			const HeadingTag = `h${Math.min(Math.max(node.level, 1), 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
			elements.push(<HeadingTag key={key}>{node.content}</HeadingTag>);
			i++;
		} else if (node.type === 'list-item') {
			const listItems: React.ReactElement[] = [];
			while (i < nodes.length) {
				const current = nodes[i];
				if (current.type !== 'list-item') break;
				listItems.push(<li key={`rn-${i}`}>{current.content}</li>);
				i++;
			}
			elements.push(<ul key={key}>{listItems}</ul>);
		} else if (node.type === 'paragraph') {
			elements.push(<p key={key}>{node.content}</p>);
			i++;
		} else {
			// hr
			elements.push(<hr key={key} />);
			i++;
		}
	}

	return <>{elements}</>;
};
