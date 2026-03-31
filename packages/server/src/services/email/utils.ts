import renderMarkdown from '../../utils/renderMarkdown';

export function markdownBodyToPlainText(md: string): string {
	// Just convert the links to plain URLs
	return md.replace(/\[.*\]\((.*)\)/g, '$1');
}

export function markdownBodyToHtml(md: string): string {
	return renderMarkdown(md);
}
