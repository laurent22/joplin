import { EditOp } from './noteChat';

export type ApplyEditStatus = 'applied' | 'anchor-not-found' | 'invalid';

// Fenced blocks the model is allowed to replace wholesale. These are
// structured-document formats (canvas JSON, diagrams, sheet music, screenplays)
// where surgical anchor-based edits don't make sense — the model regenerates
// the entire block instead. Plain code fences (```js, ```python, ...) are
// deliberately excluded; the model should edit them via insertBefore /
// replaceRange / replaceSelection like any other text.
export const structuredBlockTags = new Set<string>([
	'jsoncanvas', 'mermaid', 'abc', 'fountain',
]);

// Matches a ```<tag>\n<inner>\n``` (or ```<tag>\n<inner>```) block. Global so
// callers can iterate all occurrences and pick by position.
const fencedBlockRegex = (tag: string) =>
	new RegExp(`\`\`\`${tag}\\s*\\n([\\s\\S]*?)\\n?\`\`\``, 'gi');

// Returns the match of the ```<tag>``` block closest to cursorPos, or null.
// When the cursor is at 0 (no selection / no disambiguation available) the
// first match wins by virtue of being the closest. Mirrors findAnchor's
// tiebreak logic so behaviour stays consistent across ops.
const findFencedBlock = (body: string, tag: string, cursorPos: number) => {
	const re = fencedBlockRegex(tag);
	let best: RegExpExecArray | null = null;
	let bestDistance = Infinity;
	let match: RegExpExecArray | null;
	while ((match = re.exec(body)) !== null) {
		const distance = Math.abs(match.index - cursorPos);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = match;
		}
		// Guard against zero-width matches looping forever (the regex requires
		// a backtick fence so this shouldn't happen, but cheap to be safe).
		if (match.index === re.lastIndex) re.lastIndex++;
	}
	return best;
};

export interface AppliedEdit {
	op: EditOp;
	status: ApplyEditStatus;
}

export interface EditApplicationResult {
	newBody: string;
	appliedEdits: AppliedEdit[];
}

const findAnchor = (body: string, anchor: string, cursorPos: number) => {
	if (!anchor) return -1;

	const first = body.indexOf(anchor);
	if (first === -1) return -1;

	// If the anchor occurs more than once, prefer the occurrence closest to
	// the current cursor — matches the user's likely intent when they ask the
	// model to act "here".
	const second = body.indexOf(anchor, first + 1);
	if (second === -1) return first;

	let bestIndex = first;
	let bestDistance = Math.abs(first - cursorPos);
	let next = second;
	while (next !== -1) {
		const distance = Math.abs(next - cursorPos);
		if (distance < bestDistance) {
			bestDistance = distance;
			bestIndex = next;
		}
		next = body.indexOf(anchor, next + 1);
	}
	return bestIndex;
};

// Rejects edits the model produced but that wouldn't make sense to apply:
// missing text/anchor, or a replaceRange whose anchor covers most of the
// note (which would silently nuke it).
const isValidEdit = (edit: EditOp, bodyLength: number): boolean => {
	if (!edit || typeof edit !== 'object') return false;
	if (typeof edit.op !== 'string') return false;

	switch (edit.op) {
	case 'appendToNote':
	case 'replaceSelection':
		return typeof edit.text === 'string';
	case 'insertBefore':
	case 'insertAfter':
		return typeof edit.anchor === 'string' && edit.anchor.length > 0 && typeof edit.text === 'string';
	case 'replaceRange':
		if (typeof edit.anchor !== 'string' || !edit.anchor.length) return false;
		if (typeof edit.text !== 'string') return false;
		// Refuse anchors that would replace most of the note — a likely sign
		// the model intended replaceSelection or appendToNote.
		if (edit.anchor.length > bodyLength * 0.5) return false;
		return true;
	case 'replaceFencedBlock':
		if (typeof edit.tag !== 'string' || !structuredBlockTags.has(edit.tag)) return false;
		if (typeof edit.text !== 'string') return false;
		return true;
	default:
		return false;
	}
};

// Applies anchor-based edits (insertBefore / insertAfter / appendToNote /
// replaceRange) by computing the new full body. The replaceSelection op is
// handled separately by the caller via the editor's replaceSelection command,
// since selection is editor state, not body state.
//
// Edits are applied sequentially against the running `newBody`, so a later
// anchor that targeted text removed by an earlier edit won't be found. That
// matches the simplest mental model and avoids reordering surprises.
export const applyAnchorEdits = (
	body: string,
	edits: EditOp[],
	cursorPos: number,
): EditApplicationResult => {
	let newBody = body;
	const appliedEdits: AppliedEdit[] = [];

	for (const edit of edits) {
		if (!isValidEdit(edit, newBody.length)) {
			appliedEdits.push({ op: edit, status: 'invalid' });
			continue;
		}

		if (edit.op === 'replaceSelection') {
			// Caller handles this via the editor; we mark it applied so it's
			// not retried here.
			appliedEdits.push({ op: edit, status: 'applied' });
			continue;
		}

		if (edit.op === 'appendToNote') {
			// Markdown paragraph breaks require a blank line, otherwise the
			// appended block merges with the previous paragraph.
			let sep = '';
			if (newBody.length) {
				if (newBody.endsWith('\n\n')) sep = '';
				else if (newBody.endsWith('\n')) sep = '\n';
				else sep = '\n\n';
			}
			newBody = `${newBody}${sep}${edit.text}`;
			appliedEdits.push({ op: edit, status: 'applied' });
			continue;
		}

		if (edit.op === 'replaceFencedBlock') {
			// Replace-only: if the block doesn't exist, report missing and
			// let the model retry with appendToNote. We don't try to create
			// the block here — that's appendToNote's job, and conflating the
			// two would let one op silently grow the note in surprising ways.
			//
			// When the note contains multiple blocks of the same tag, pick the
			// one closest to the cursor — matches what findAnchor does for
			// duplicate anchors. With no selection the cursor is at 0, so the
			// first occurrence wins (the previous fallback behaviour).
			const match = findFencedBlock(newBody, edit.tag, cursorPos);
			if (!match) {
				appliedEdits.push({ op: edit, status: 'anchor-not-found' });
				continue;
			}
			const start = match.index;
			const end = start + match[0].length;
			const inner = edit.text.endsWith('\n') ? edit.text : `${edit.text}\n`;
			newBody = `${newBody.slice(0, start)}\`\`\`${edit.tag}\n${inner}\`\`\`${newBody.slice(end)}`;
			appliedEdits.push({ op: edit, status: 'applied' });
			continue;
		}

		const index = findAnchor(newBody, edit.anchor, cursorPos);
		if (index === -1) {
			appliedEdits.push({ op: edit, status: 'anchor-not-found' });
			continue;
		}

		if (edit.op === 'insertBefore') {
			newBody = `${newBody.slice(0, index)}${edit.text}${newBody.slice(index)}`;
		} else if (edit.op === 'insertAfter') {
			const insertAt = index + edit.anchor.length;
			newBody = `${newBody.slice(0, insertAt)}${edit.text}${newBody.slice(insertAt)}`;
		} else if (edit.op === 'replaceRange') {
			newBody = `${newBody.slice(0, index)}${edit.text}${newBody.slice(index + edit.anchor.length)}`;
		}
		appliedEdits.push({ op: edit, status: 'applied' });
	}

	return { newBody, appliedEdits };
};
