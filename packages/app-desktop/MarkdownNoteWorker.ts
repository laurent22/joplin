// Web Worker for converting note HTML body to Markdown using turndown
// This worker runs off the main thread to avoid blocking the UI.
// Tasks are queued and processed sequentially to avoid race conditions.

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

const gTaskQueue: MarkdownNoteTask[] = [];
let gTaskQueueRunning = false;

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

function processQueue() {
	while (gTaskQueue.length > 0) {
		const task = gTaskQueue.shift();
		const { noteId, parentId, title, body } = task;

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
	}
	gTaskQueueRunning = false;
}

self.onmessage = function(e: MessageEvent<MarkdownNoteTask>) {
	gTaskQueue.push(e.data);
	if (gTaskQueueRunning) return;

	gTaskQueueRunning = true;
	processQueue();
};
