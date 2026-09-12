import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

// Minimal demo of the joplin.ai.search() plugin API.
//
// - Prompts the user for a query string in a dialog.
// - Runs a semantic search against the local embeddings index.
// - Writes a new "AI search results" note with each hit as a clickable note
//   link, score, and chunk excerpt, then opens it.
//
// Requires: AI enabled in Settings → AI, the embedding indexer to have run at
// least once (so there's something to search), and ONNX runtime available on
// this platform (i.e. not macOS Intel).

interface SearchHit {
	noteId: string;
	chunkIndex: number;
	chunkText: string;
	score: number;
}

const trimChunk = (s: string, max = 240) => {
	const clean = s.replace(/\s+/g, ' ').trim();
	return clean.length > max ? `${clean.slice(0, max)}…` : clean;
};

joplin.plugins.register({
	onStart: async function() {
		const dialogs = joplin.views.dialogs;

		// Create the prompt dialog ONCE at startup. Calling create() a second
		// time with the same id returns a stale handle that open() ignores,
		// so the button silently does nothing on the second click.
		const promptHandle = await dialogs.create('aiSearchPrompt');
		await dialogs.setHtml(promptHandle, `
			<p>Enter a search query. The active embedding model decides what counts as a "match".</p>
			<form name="search">
				<label>Query: <input type="text" name="query" style="width: 320px" autofocus /></label>
			</form>
		`);

		await joplin.commands.register({
			name: 'aiSemanticSearch',
			label: 'Semantic search (AI)',
			iconName: 'fas fa-search',
			execute: async () => {
				const promptResult = await dialogs.open(promptHandle);
				if (promptResult.id !== 'ok') return;
				const query = ((promptResult.formData as any)?.search?.query ?? '').trim();
				if (!query) {
					alert('Empty query.');
					return;
				}

				// Run the search. See the comment in ai_chat for why this has to be
				// reached from `joplin` in a single chained expression — the plugin
				// sandbox proxy tracks property access paths and storing
				// `joplin.ai` or `joplin.ai.search` partway through corrupts that.
				let results: SearchHit[];
				try {
					results = await (joplin as any).ai.search({
						query: { text: query },
						relevance: 'normal',
					});
				} catch (error) {
					alert(`Search failed: ${error.message}`);
					return;
				}

				if (!results.length) {
					alert(`No matches found for: ${query}`);
					return;
				}

				// Best chunk per note — multiple chunks of the same note often
				// land in the top results; in a results note we only want one
				// entry per source note, using the highest-scoring chunk.
				const bestPerNote = new Map<string, SearchHit>();
				for (const r of results) {
					const existing = bestPerNote.get(r.noteId);
					if (!existing || r.score > existing.score) bestPerNote.set(r.noteId, r);
				}
				const hits = Array.from(bestPerNote.values()).sort((a, b) => b.score - a.score);

				// Fetch titles in parallel. Notes that have been deleted in
				// the gap between indexing and querying just get "(missing)".
				const titles = await Promise.all(hits.map(async hit => {
					try {
						const note = await joplin.data.get(['notes', hit.noteId], { fields: ['title'] });
						return note.title || '(untitled)';
					} catch {
						return '(missing)';
					}
				}));

				const lines = [
					`# AI search results: ${query}`,
					'',
					`_${hits.length} match${hits.length === 1 ? '' : 'es'}, sorted by similarity._`,
					'',
				];
				hits.forEach((hit, i) => {
					lines.push(`## ${i + 1}. [${titles[i]}](:/${hit.noteId}) — \`${hit.score.toFixed(3)}\``);
					lines.push('');
					lines.push(`> ${trimChunk(hit.chunkText)}`);
					lines.push('');
				});

				const folderId = (await joplin.workspace.selectedFolder())?.id;
				const created = await joplin.data.post(['notes'], null, {
					title: `AI search: ${query}`,
					body: lines.join('\n'),
					parent_id: folderId,
				});

				// Jump to the new note so the user sees the results immediately.
				await joplin.commands.execute('openNote', created.id);
			},
		});

		await joplin.views.toolbarButtons.create(
			'aiSemanticSearch',
			'aiSemanticSearch',
			ToolbarButtonLocation.NoteToolbar,
		);
	},
});
