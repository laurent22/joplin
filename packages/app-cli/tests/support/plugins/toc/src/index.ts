import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

const uslug = require('@joplin/fork-uslug');

// From https://stackoverflow.com/a/6234804/561309
function escapeHtml(unsafe:string) {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

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
		const panels = joplin.views.panels;

		const view = await panels.create("panel_1");

		await panels.setHtml(view, 'Loading...');
		await panels.addScript(view, './webview.js');
		await panels.addScript(view, './webview.css');

		await panels.onMessage(view, (message:any) => {
			if (message.name === 'scrollToHash') {
				joplin.commands.execute('scrollToHash', message.hash)
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
							<a class="toc-item-link" href="#" data-slug="${escapeHtml(slug)}">
								${escapeHtml(header.text)}
							</a>
						</p>
					`);
				}

				await panels.setHtml(view, `
					<div class="container">
						${itemHtml.join('\n')}
					</div>
				`);
			} else {
				await panels.setHtml(view, 'Please select a note to view the table of content');
			}
		}

		joplin.workspace.onNoteSelectionChange(() => {
			updateTocView();
		});

		joplin.workspace.onNoteChange(() => {
			updateTocView();
		});

		await joplin.commands.register({
			name: 'toggleToc',
			label: 'Toggle TOC',
			iconName: 'fas fa-drum',
			execute: async () => {
				const isVisible = await panels.visible(view);
				await panels.show(view, !isVisible);
			},
		});

		await joplin.views.toolbarButtons.create('toggleToc', 'toggleToc', ToolbarButtonLocation.NoteToolbar);

		updateTocView();
	},
});