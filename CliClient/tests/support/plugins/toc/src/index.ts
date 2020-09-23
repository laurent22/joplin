const uslug = require('uslug');

function noteHeaders(noteBody:string) {
	const headers = [];
	const lines = noteBody.split('\n');
	for (const line of lines) {
		const match = line.match(/^(#+)\s(.*)*/);
		if (!match) continue;
		headers.push({
			level: match[1].length,
			text: match[2],
		});
	}
	return headers;
}

let slugs:any = {};

function headerSlug(headerText:string) {
	const s = uslug(headerText);
	let num = slugs[s] ? slugs[s] : 1;
	const output = [s];
	if (num > 1) output.push(num);
	slugs[s] = num + 1;
	return output.join('-');
}

joplin.plugins.register({
	onStart: async function() {
		const tocView = joplin.views.createWebviewPanel();
		tocView.html = 'Loading...';
		tocView.addScript('./webview.js');
		tocView.addScript('./webview.css');

		tocView.onMessage((message:any) => {
			if (message.name === 'scrollToHash') {
				joplin.commands.execute('scrollToHash', {
					hash: message.hash,
				})
			}
		});

		async function updateTocView() {
			const note = await joplin.workspace.selectedNote();
			slugs = {};

			if (note) {
				const headers = noteHeaders(note.body);

				const itemHtml = [];
				for (const header of headers) {
					const slug = headerSlug(header.text);

					itemHtml.push(`
						<p class="toc-item" style="padding-left:${(header.level - 1) * 15}px">
							<a class="toc-item-link" href="#" data-slug="${joplin.utils.escapeHtml(slug)}">
								${joplin.utils.escapeHtml(header.text)}
							</a>
						</p>
					`);
				}

				tocView.html = `
					<div class="container">
						${itemHtml.join('\n')}
					</div>
				`;
			} else {
				tocView.html = 'Please select a note to view the table of content';
			}
		}

		joplin.workspace.onNoteSelectionChange(() => {
			updateTocView();
		});

		joplin.workspace.onNoteContentChange(() => {
			updateTocView();
		});

		updateTocView();
	},
});