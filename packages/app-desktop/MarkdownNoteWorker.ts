// Web Worker for converting note HTML body to Markdown using turndown
// This worker runs off the main thread to avoid blocking the UI.

// @ts-ignore
export = {};

const TurndownService = require('@joplin/turndown');
const turndownPluginGfm = require('@joplin/turndown-plugin-gfm').gfm;

interface MarkdownNoteTask {
	noteId: string;
	parentId: string;
	title: string;
	body: string;
}

function htmlToMarkdown(html: string): string {
	const turndown = new TurndownService({
		headingStyle: 'atx',
		codeBlockStyle: 'fenced',
		bulletListMarker: '-',
		emDelimiter: '*',
		strongDelimiter: '**',
		br: '',
	});
	turndown.use(turndownPluginGfm);
	turndown.remove('script');
	turndown.remove('style');
	return turndown.turndown(html);
}

self.onmessage = function(e: MessageEvent<MarkdownNoteTask>) {
	const { noteId, parentId, title, body } = e.data;

	try {
		const markdownBody = htmlToMarkdown(body);

		(self as any).postMessage({
			noteId,
			parentId,
			title,
			markdownBody,
			error: null,
		});
	} catch (error) {
		(self as any).postMessage({
			noteId,
			parentId,
			title,
			markdownBody: '',
			error: error.message || 'Unknown error during HTML to Markdown conversion',
		});
	}
};
