import { Attrs, NodeType, Node } from 'prosemirror-model';
import { TextSelection, Transaction, Selection } from 'prosemirror-state';
import schema from '../schema';
import { canSplit } from 'prosemirror-transform';

interface ExtractToOptions {
	type: NodeType;
	attrs: Attrs;
}

// Pulls the lines (separated by hard breaks) that include selected text out of the
// paragraphs that contain the selection.
// This is useful, for example, to convert just the line that contains the cursor to a
// block of some type, rather than the entire paragraph.
const extractSelectedLinesTo = (extractTo: ExtractToOptions, transaction: Transaction, selection: Selection) => {
	let firstParagraphPos = -1;
	let lastParagraphPos = -1;
	let foundParagraph = false;
	transaction.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
		if (node.type === schema.nodes.paragraph) {
			if (!foundParagraph) {
				firstParagraphPos = pos;
				lastParagraphPos = pos;
			}

			firstParagraphPos = Math.min(pos, firstParagraphPos);
			lastParagraphPos = Math.max(pos, lastParagraphPos);
			foundParagraph = true;
		}
	});

	if (!foundParagraph) return null;

	const firstParagraphFrom = firstParagraphPos;
	const lastParagraph = transaction.doc.nodeAt(lastParagraphPos);
	// -1: Exclude the end token
	const lastParagraphTo = lastParagraphPos + lastParagraph.nodeSize - 1;

	// Find the previous and next <br/>s (or the start/end of the paragraph)
	let fromBreakPosition = firstParagraphFrom;
	let fromBreak: Node|null = null;
	let toBreakPosition = lastParagraphTo;
	let toBreak: Node|null = null;

	transaction.doc.nodesBetween(firstParagraphFrom, lastParagraphTo, (node, pos) => {
		if (node.type === schema.nodes.hard_break) {
			if (pos + node.nodeSize <= selection.from && fromBreakPosition <= pos) {
				fromBreakPosition = Math.max(fromBreakPosition, pos);
				fromBreak = node;
			} else if (pos >= selection.to && toBreakPosition >= pos) {
				toBreakPosition = Math.min(toBreakPosition, pos);
				toBreak = node;
			}
		}
	});

	// Check whether this would result in a change
	if (!fromBreak && !toBreak) {
		const wouldChange = (blockNode: Node) => {
			if (blockNode.type !== extractTo.type) return true;

			let changesAttributes = false;
			for (const [key, value] of Object.entries(extractTo.attrs)) {
				if (blockNode.attrs[key] !== value) {
					changesAttributes = true;
				}
			}
			return changesAttributes;
		};

		const candidateNodes = transaction.doc.slice(firstParagraphFrom, lastParagraphTo).content;
		let changes = false;
		for (const node of candidateNodes.content) {
			if (wouldChange(node)) {
				changes = true;
				break;
			}
		}

		if (!changes) {
			return null; // the transaction would do nothing -- skip
		}
	}

	// Helper function: Determine the final value of `position` after
	// applying `transaction` to the document.
	const map = (position: number, associativity?: number) => {
		return transaction.mapping.map(position, associativity);
	};

	const replaceBreakWithSplit = (hardBreak: Node, position: number) => {
		if (hardBreak && canSplit(transaction.doc, map(position))) {
			transaction = transaction.split(map(position));
			transaction = transaction.delete(
				map(position),
				map(position + hardBreak.nodeSize),
			);
		}
	};

	// Replace the starting <br/> with a split
	replaceBreakWithSplit(fromBreak, fromBreakPosition);
	// ...and the ending <br/> (if any)
	replaceBreakWithSplit(toBreak, toBreakPosition);

	transaction = transaction.setBlockType(map(fromBreakPosition, 1), map(toBreakPosition, -1), extractTo.type, extractTo.attrs);

	// Build a custom final selection -- the default mapping grows the selection, but we want it to shrink,
	// to avoid moving the cursor to the beginning of the content after the current item:
	let finalSelection: Selection = TextSelection.create(transaction.doc, map(toBreakPosition, -1));
	if (!selection.empty) {
		finalSelection = TextSelection.create(transaction.doc, map(fromBreakPosition, 1), map(toBreakPosition, -1));
	}
	transaction = transaction.setSelection(finalSelection);

	return { transaction, finalSelection };
};

export default extractSelectedLinesTo;
