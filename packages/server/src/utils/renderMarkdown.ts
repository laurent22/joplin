
import MarkdownIt from 'markdown-it';
export default function(md: string): string {
	const markdownIt = new MarkdownIt({
		linkify: true,
	});
	return markdownIt.render(md);
}
