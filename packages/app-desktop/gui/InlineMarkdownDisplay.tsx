import * as React from 'react';
import { useEffect, useRef } from 'react';
import MarkdownIt = require('markdown-it');
import { isResourceUrl } from '@joplin/lib/urlUtils';
import { isHttpOrHttpsUrl } from '@joplin/utils/url';
import CommandService from '@joplin/lib/services/CommandService';

interface Props {
	className: string;
	markdown: string;
	themeId: number;
}

const InlineMarkdownDisplay: React.FC<Props> = props => {
	const outputElementRef = useRef<HTMLDivElement|null>(null);
	useEffect(() => {
		outputElementRef.current.replaceChildren(
			renderMarkdownToElement(props.markdown),
		);
	}, [props.markdown]);

	return <div className={`inline-markdown ${props.className}`} ref={outputElementRef} />;
};

export default InlineMarkdownDisplay;

const renderMarkdownToElement = (markdown: string) => {
	// Since we're including the output in the main document, use markdown-it directly with minimal
	// settings (e.g. HTML rendering disabled).
	const markdownIt = MarkdownIt()
		.set({
			// Match Joplin's main renderer
			breaks: false,
			linkify: true,
		})
		.disable('image');
	const rendered = markdownIt.render(markdown);

	const markdownContainer = document.createElement('div');
	markdownContainer.innerHTML = rendered;

	// Make links clickable
	for (const link of markdownContainer.querySelectorAll<HTMLAnchorElement>('a[href]')) {
		const href = link.getAttribute('href');
		const url = isResourceUrl(href) || isHttpOrHttpsUrl(href) ? href : '#';
		link.href = '#';
		link.title = url;

		link.onclick = (event) => {
			event.preventDefault();

			void CommandService.instance().execute('openItem', url);
		};
	}

	return markdownContainer;
};
