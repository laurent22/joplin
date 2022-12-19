import MarkdownIt = require('markdown-it');

export function markdownBodyToPlainText(md: string): string {
	// Just convert the links to plain URLs
	return md.replace(/\[.*\]\((.*)\)/g, '$1');
}

// TODO: replace with renderMarkdown()
export function markdownBodyToHtml(md: string): string {
	const markdownIt = new MarkdownIt({
		linkify: true,
	});
	return markdownIt.render(md);
}
