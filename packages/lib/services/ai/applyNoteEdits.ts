import { EditOp } from './noteChat';

export type ApplyEditStatus = 'applied' | 'anchor-not-found' | 'invalid';

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
