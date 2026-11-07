// cspell:ignore jamo
// Adds a "No results" indicator to the built-in CodeMirror search panel:
// when the current query has no matches in the document, a status message is
// shown and the next/previous buttons are disabled.
//
// Match checks avoid CodeMirror's SearchCursor for plain-text and whole-word
// queries: SearchCursor scans the document code point by code point in
// JavaScript, which is slow when a large note has no matches (measured:
// roughly 65 ms down to 2 ms per keystroke on a 1 MB ASCII note). The checks
// below reproduce SearchCursor's exact matching semantics using native string
// operations and cache the processed document, so that typing in the search
// input does not reprocess the note.

import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { getSearchQuery, searchPanelOpen, SearchQuery, setSearchQuery } from '@codemirror/search';
import { Text } from '@codemirror/state';
import { _ } from '@joplin/lib/locale';

const statusClass = 'cm-search-no-results';

const hasNormalize = typeof String.prototype.normalize === 'function';
const basicNormalize = hasNormalize ? (text: string) => text.normalize('NFKD') : (text: string) => text;

// SearchCursor compares the document and the query after normalizing each
// with NFKD (and lowercasing both when the search is case-insensitive). The
// document is normalized one code point at a time, which can differ from
// normalizing the whole string at once around combining marks. It also only
// reports matches that end at the end of a code point's normalized form --
// for example, "cafe" does not match "café" (U+00E9 normalizes to "e" plus a
// combining mark), while "café" matches it.
interface FoldedDocument {
	text: string;
	// null when the fold was the identity (possibly besides case folding).
	// Then, only the interiors of astral (surrogate pair) code points are not
	// valid match ends. Otherwise, boundaries[i] is 1 when folded-text offset
	// i is in the middle of a code point's folded form.
	boundaries: Uint8Array|null;
}

// The same escape handling as SearchQuery, whose `unquoted` property is not
// part of the public API.
const unquote = (text: string) =>
	text.replace(/\\([nrt\\])/g, (_, ch) => ch === 'n' ? '\n' : ch === 'r' ? '\r' : ch === 't' ? '\t' : '\\');

// NFKD decomposes Hangul syllables into jamo. Doing this arithmetically is
// much faster than String.prototype.normalize for Korean text.
let hangulDecompositions: string[]|null = null;
const decomposeHangul = (code: number) => {
	if (!hangulDecompositions) {
		hangulDecompositions = [];
		for (let s = 0; s < 11172; s++) {
			const l = 0x1100 + Math.floor(s / 588);
			const v = 0x1161 + Math.floor((s % 588) / 28);
			const t = s % 28;
			hangulDecompositions.push(t ? String.fromCharCode(l, v, 0x11A7 + t) : String.fromCharCode(l, v));
		}
	}
	return hangulDecompositions[code - 0xAC00];
};

const foldDocument = (docText: string, lower: boolean): FoldedDocument => {
	// Fast path: when the document is already in NFKD, normalizing each code
	// point is the identity, so a substring scan of the document itself is
	// equivalent to the cursor. The U+03A3 (capital sigma) check keeps the
	// whole-string lowercase below equivalent to the cursor's per-code-point
	// lowercase: whole-string lowercasing is context-sensitive for sigma.
	if (basicNormalize(docText) === docText && !(lower && docText.includes('\u03A3'))) {
		return { text: lower ? docText.toLowerCase() : docText, boundaries: null };
	}

	const chunks: string[] = [];
	let chunk = '';
	const interior: number[] = [];
	let outLen = 0, runStart = 0, i = 0;

	const pushPiece = (piece: string) => {
		chunk += piece;
		if (chunk.length >= 16384) {
			chunks.push(chunk);
			chunk = '';
		}
	};
	// Runs of characters that normalize to themselves are copied as-is.
	const flushRun = (end: number) => {
		if (end > runStart) {
			const run = docText.slice(runStart, end);
			pushPiece(run);
			outLen += run.length;
		}
	};

	const n = docText.length;
	while (i < n) {
		const code = docText.charCodeAt(i);
		// All characters below U+00A0 normalize to themselves.
		if (code < 0xA0) {
			i++;
			continue;
		}
		let cpStr: string, cpLen: number, folded: string;
		if (code >= 0xD800 && code < 0xDC00 && i + 1 < n) {
			const next = docText.charCodeAt(i + 1);
			if (next >= 0xDC00 && next < 0xE000) {
				cpStr = docText.slice(i, i + 2);
				cpLen = 2;
			} else {
				cpStr = docText.charAt(i);
				cpLen = 1;
			}
		} else {
			cpStr = docText.charAt(i);
			cpLen = 1;
		}
		if (code >= 0xAC00 && code <= 0xD7A3) {
			folded = decomposeHangul(code);
		} else if (lower && cpStr === '\u03A3') {
			// Match the cursor's context-insensitive per-code-point lowercase.
			// This case must stay out of runs (below) so the whole-string
			// lowercase never sees a capital sigma in context.
			folded = '\u03C3';
		} else {
			folded = basicNormalize(cpStr);
			// The cursor lowercases each code point's folded form
			// independently: whole-string lowercasing is context-sensitive
			// for U+03A3, which code points such as U+03F9 (lunate sigma) or
			// U+1D6BA (mathematical bold capital sigma) fold to under NFKD.
			if (lower) folded = folded.toLowerCase();
		}
		if (folded === cpStr && cpLen === 1) {
			i++;
			continue;
		}
		flushRun(i);
		pushPiece(folded);
		for (let k = 1; k < folded.length; k++) {
			interior.push(outLen + k);
		}
		outLen += folded.length;
		i += cpLen;
		runStart = i;
	}
	flushRun(n);
	if (chunk) chunks.push(chunk);

	let text = chunks.length === 1 ? chunks[0] : chunks.join('');
	const boundaries = new Uint8Array(text.length + 1);
	for (const p of interior) boundaries[p] = 1;
	// Lowercasing the folded text as a whole is equivalent to the cursor's
	// per-code-point lowercase here: the folded text contains no U+03A3
	// (literal ones are mapped per code point above, and NFKD-produced ones
	// were lowercased within their own piece) and no code point whose
	// lowercase changes its length (the only such code point, U+0130, is
	// decomposed by NFKD first). Final-sigma is the only context-sensitive
	// mapping in the default (locale-insensitive) lowercase.
	if (lower) text = text.toLowerCase();
	return { text, boundaries };
};

// Documents are immutable, so the folded form can be cached by document.
// Typing in the search input changes only the query, and reuses the cache.
const foldCache = new WeakMap<Text, { foldedLower?: FoldedDocument; foldedExact?: FoldedDocument }>();
const getFoldedDocument = (doc: Text, lower: boolean): FoldedDocument => {
	let entry = foldCache.get(doc);
	if (!entry) {
		entry = {};
		foldCache.set(doc, entry);
	}
	const key = lower ? 'foldedLower' : 'foldedExact';
	if (!entry[key]) {
		entry[key] = foldDocument(doc.toString(), lower);
	}
	return entry[key];
};

const isIdentityBoundary = (text: string, end: number) =>
	end === text.length || !(text.charCodeAt(end - 1) >= 0xD800 && text.charCodeAt(end - 1) < 0xDC00 &&
		text.charCodeAt(end) >= 0xDC00 && text.charCodeAt(end) < 0xE000);

const plainTextExists = (folded: FoldedDocument, needle: string): boolean => {
	if (!needle.length) return true;
	let from = 0;
	for (;;) {
		const idx = folded.text.indexOf(needle, from);
		if (idx < 0) return false;
		const end = idx + needle.length;
		const validEnd = folded.boundaries ? folded.boundaries[end] === 0 : isIdentityBoundary(folded.text, end);
		if (validEnd) return true;
		from = idx + 1;
	}
};

const queryHasMatch = (view: EditorView, query: SearchQuery): boolean => {
	if (!query.valid) return false;
	// Regexp queries, and queries with a custom match test (unused by the
	// built-in search panel), keep the exact cursor behavior.
	if (query.regexp || (query as unknown as { test?: unknown }).test) {
		return !query.getCursor(view.state).next().done;
	}

	const lower = !query.caseSensitive;
	const raw = query.literal ? query.search : unquote(query.search);
	const needle = lower ? basicNormalize(raw).toLowerCase() : basicNormalize(raw);
	if (!plainTextExists(getFoldedDocument(view.state.doc, lower), needle)) {
		return false;
	}
	if (!query.wholeWord) {
		return true;
	}
	// A whole-word query whose text occurs can still fail the word-boundary
	// check - defer to the cursor, which stops at the first match.
	return !query.getCursor(view.state).next().done;
};

const updatePanelStatus = (view: EditorView) => {
	// The mobile app uses its own (React Native) search dialog - there is no
	// search panel element to update in that case.
	const panelDom = view.dom.querySelector<HTMLElement>('.cm-panel.cm-search');
	if (!panelDom) return;

	let status = panelDom.querySelector<HTMLElement>(`.${statusClass}`);
	if (!status) {
		status = document.createElement('span');
		status.className = statusClass;
		status.setAttribute('role', 'status');
		status.setAttribute('aria-live', 'polite');
		// input[name=search] is set by CodeMirror itself, independent of locale.
		panelDom.querySelector('input[name=search]')?.insertAdjacentElement('afterend', status);
	}

	const query = getSearchQuery(view.state);
	const noResults = query.search.length > 0 && !queryHasMatch(view, query);

	// Avoid redundant DOM writes so screen readers are not re-announced the
	// same status on every editor update.
	const statusText = noResults ? _('No results') : '';
	if (status.textContent !== statusText) {
		status.textContent = statusText;
	}
	status.style.display = noResults ? '' : 'none';
	for (const name of ['next', 'prev']) {
		const button = panelDom.querySelector<HTMLButtonElement>(`button[name=${name}]`);
		if (button && button.disabled !== noResults) {
			button.disabled = noResults;
		}
	}
};

// Panel plugin: refreshes the status when the panel opens, the query changes,
// or the document changes while the panel is open.
const noResultsSearchStatus = ViewPlugin.fromClass(class {
	public constructor(private view: EditorView) { }

	public update(update: ViewUpdate) {
		if (!searchPanelOpen(update.state)) return;
		const justOpened = !searchPanelOpen(update.startState);
		const queryChanged = update.transactions.some(tr => tr.effects.some(e => e.is(setSearchQuery)));
		if (justOpened || queryChanged || update.docChanged) {
			// ViewPlugin.update runs after the view's DOM update, so the panel
			// element is already present.
			updatePanelStatus(this.view);
		}
	}
});

export default noResultsSearchStatus;
