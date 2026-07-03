import * as React from 'react';
import { useRef } from 'react';
import useMarkupToHtml from './hooks/useMarkupToHtml';
import { ScrollbarSize } from '@joplin/lib/models/settings/builtInMetadata';
import { MarkupLanguage } from '@joplin/renderer';
import dompurify = require('dompurify');
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import CommandService from '@joplin/lib/services/CommandService';
import isItemId from '@joplin/lib/models/utils/isItemId';
import { RenderResult } from '@joplin/renderer/types';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';

interface Props {
	className: string;
	markdown: string;
	themeId: number;
}

const emptyPluginStates: PluginStates = {};

const InlineMarkdownDisplay: React.FC<Props> = props => {
	const markupToHtml = useMarkupToHtml({
		themeId: props.themeId,
		customCss: '',
		whiteBackgroundNoteRendering: false,
		scrollbarSize: ScrollbarSize.Medium,
		baseFontFamily: 'inherit',
		// For now, don't load plugins:
		plugins: emptyPluginStates,
	});

	const outputElementRef = useRef<HTMLDivElement|null>(null);
	useAsyncEffect(async (event) => {
		const result = await markupToHtml(MarkupLanguage.Markdown, props.markdown, { bodyOnly: true });
		if (event.cancelled) return;

		outputElementRef.current.replaceChildren(
			sanitizeAndPostprocessRenderedOutput(result),
		);
	}, [props.markdown, markupToHtml]);

	return <div className={`inline-markdown ${props.className}`} ref={outputElementRef} />;
};

export default InlineMarkdownDisplay;


const sanitizeAndPostprocessRenderedOutput = (renderResult: RenderResult) => {
	const renderedContent = document.createElement('div');
	// Since we're including the output in the main document, do an additional sanitization step.
	// Disallow inline styles to avoid absolutely positioned content that can render outside the
	// Markdown region.
	renderedContent.innerHTML = dompurify.sanitize(
		renderResult.html, { FORBID_ATTR: ['style'] },
	);

	// Make links clickable
	for (const link of renderedContent.querySelectorAll<HTMLAnchorElement>('a[href]')) {
		const resourceId = link.getAttribute('data-resource-id');
		const url = resourceId && isItemId(resourceId) ? `:/${resourceId}` : link.getAttribute('href');
		link.href = '#';
		link.title = url;

		link.onclick = (event) => {
			event.preventDefault();

			void CommandService.instance().execute('openItem', url);
		};
	}

	// Avoid duplicate math caused by missing styles (show only the MathML)
	for (const katexDisplay of renderedContent.querySelectorAll('.katex-html')) {
		katexDisplay.remove();
	}

	return renderedContent;
};
