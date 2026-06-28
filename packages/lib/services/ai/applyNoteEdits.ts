import { EditOp } from './noteChat';

export type ApplyEditStatus = 'applied' | 'anchor-not-found' | 'invalid';

// Structured-document fences where the model regenerates the whole block —
// plain code fences (```js, ```python) are deliberately excluded.
export const structuredBlockTags = new Set<string>([
	'jsoncanvas', 'mermaid', 'abc', 'fountain',
]);

const fencedBlockRegex = (tag: string) =>
	new RegExp(`\`\`\`${tag}\\s*\\n([\\s\\S]*?)\\n?\`\`\``, 'gi');

// Cursor=0 fallback (no selection) makes the first match win naturally.
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
		// Defensive against zero-width matches looping forever.
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

	// Prefer the occurrence closest to the cursor — matches user intent.
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
		// Anchor >50% of body is almost certainly a mis-pick — would nuke it.
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

// Edits apply sequentially against the running newBody — a later anchor
// targeting text removed by an earlier edit won't be found. replaceSelection
// is body-independent and handled by the caller via the editor command.
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
			// Caller applies this via the editor; mark as done so it isn't retried.
			appliedEdits.push({ op: edit, status: 'applied' });
			continue;
		}

		if (edit.op === 'appendToNote') {
			// Markdown paragraph breaks need a blank line.
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
			// Replace-only — creating a missing block is appendToNote's job.
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
