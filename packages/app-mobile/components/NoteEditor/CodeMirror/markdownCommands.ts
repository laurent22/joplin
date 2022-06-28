
import { EditorView, Command } from '@codemirror/view';

import { ListType } from '../types';
import {
	SelectionRange, EditorSelection, ChangeSpec, Line, TransactionSpec, EditorState,
	Text as DocumentText,
} from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import RegionSpec from './RegionSpec';
import { logMessage } from './webviewLogger';



type SelectionFilter = (sel: SelectionRange)=> boolean;

// Specifies the update of a single selection region and its contents
type SelectionUpdate = { range: SelectionRange; changes?: ChangeSpec };

// Expands selections to the smallest container node
// with name [nodeName].
// Returns a new selection.
const growSelectionToNode = (
	state: EditorState, sel: SelectionRange, nodeName: string
): SelectionRange => {
	let newFrom = null;
	let newTo = null;
	let smallestLen = Infinity;

	// Find the smallest range.
	syntaxTree(state).iterate({
		from: sel.from, to: sel.to,
		enter: node => {
			if (node.name == nodeName) {
				if (node.to - node.from < smallestLen) {
					newFrom = node.from;
					newTo = node.to;
					smallestLen = newTo - newFrom;
				}
			}
		},
	});

	// If it's in such a node,
	if (newFrom != null && newTo != null) {
		return EditorSelection.range(newFrom, newTo);
	} else {
		return sel;
	}
};

// Expand each selection range to match an enclosing node with [nodeName], provided that
// node exists and [expandSelection] returns true.
const growAllSelectionsToNodes = (
	state: EditorState, nodeName: string, expandSelection: SelectionFilter
): TransactionSpec => {
	const updatedSelection = EditorSelection.create(state.selection.ranges.map((sel: SelectionRange): SelectionRange => {
		if (!expandSelection(sel)) {
			return sel;
		}

		return growSelectionToNode(state, sel, nodeName);
	}));

	return {
		selection: updatedSelection,
	};
};

// Adds/removes [spec.templateStart] before the current selection and
// [spec.templateStop] after it.
// For example, surroundSelecton('**', '**') surrounds every selection
// range with asterisks (including the caret).
// If the selection is already surrounded by these characters, they are
// removed.
const toggleRegionSurrounded = (
	doc: DocumentText, sel: SelectionRange, spec: RegionSpec
): SelectionUpdate => {
	let content = doc.sliceString(sel.from, sel.to);
	const startMatchLen = spec.matchStart(doc, sel);
	const endMatchLen = spec.matchStop(doc, sel);

	const startsWithBefore = startMatchLen >= 0;
	const endsWithAfter = endMatchLen >= 0;

	const changes = [];
	let finalSelStart = sel.from;
	let finalSelStop = sel.to;

	if (startsWithBefore && endsWithAfter) {
		// Remove the before and after.
		content = content.substring(startMatchLen);
		content = content.substring(0, content.length - endMatchLen);

		finalSelStop -= startMatchLen + endMatchLen;

		changes.push({
			from: sel.from,
			to: sel.to,
			insert: content,
		});
	} else {
		changes.push({
			from: sel.from,
			insert: spec.templateStart,
		});

		changes.push({
			from: sel.to,
			insert: spec.templateStop,
		});

		// If not a caret,
		if (!sel.empty) {
			// Select the surrounding chars.
			finalSelStop += spec.templateStart.length + spec.templateStop.length;
		} else {
			// Position the caret within the added content.
			finalSelStart = sel.from + spec.templateStart.length;
			finalSelStop = finalSelStart;
		}
	}

	return {
		changes,
		range: EditorSelection.range(finalSelStart, finalSelStop),
	};
};

// Toggles whether the current selection/caret location is
// associated with [nodeName], if [start] defines the start of
// the region and [end], the end.
const toggleGlobalSelectionFormat = (
	state: EditorState, nodeName: string, spec: RegionSpec
): TransactionSpec => {
	const changes = state.changeByRange((sel: SelectionRange) => {
		return toggleSelectionFormat(state, nodeName, sel, spec);
	});
	return changes;
};

const toggleSelectionFormat = (
	state: EditorState, nodeName: string, sel: SelectionRange, spec: RegionSpec
): SelectionUpdate => {
	const endMatchLen = spec.matchStop(state.doc, sel);

	// If at the end of the region, move the
	// caret to the end.
	// E.g.
	//   **foobar|**
	//   **foobar**|
	if (sel.empty && endMatchLen > -1) {
		const newCursorPos = sel.from + endMatchLen;

		return {
			range: EditorSelection.range(newCursorPos, newCursorPos),
		};
	}

	// Grow the selection to encompass the entire node.
	const newRange = growSelectionToNode(state, sel, nodeName);
	return toggleRegionSurrounded(state.doc, newRange, spec);
};

// Toggle formatting in a region, applying a block version of the formatting
// if multiple lines are selected.
const toggleRegionFormat = (
	state: EditorState,

	inlineNodeName: string, inlineSpec: RegionSpec,

	// The block version of the tag (e.g. fenced code)
	blockNodeName: string,
	blockRegex: { start: RegExp; stop: RegExp },

	// start: Single-line content that precedes the block
	// stop: Single-line content that follows the block.
	// line breaks will be added
	blockTemplate: { start: string; stop: string }
) => {
	const doc = state.doc;

	const getMatchEndPoints = (match: RegExpMatchArray, line: Line):
		[startIdx: number, stopIdx: number] => {
		const startIdx = line.from + match.index;
		let stopIdx;
		// If it matches the entire line, remove the newline character.
		if (match[0].length == line.text.length) {
			stopIdx = line.to + 1;
		} else {
			stopIdx = startIdx + match[0].length;
		}

		stopIdx = Math.min(stopIdx, doc.length);
		return [startIdx, stopIdx];
	};

	const changes = state.changeByRange((sel: SelectionRange) => {

		// If we're in the block version, grow the selection to cover the entire region.
		sel = growSelectionToNode(state, sel, blockNodeName);

		const fromLine = doc.lineAt(sel.from);
		const toLine = doc.lineAt(sel.to);
		let charsAdded = 0;
		const changes = [];

		// Single line: Inline toggle.
		if (fromLine.number == toLine.number) {
			return toggleSelectionFormat(state, inlineNodeName, sel, inlineSpec);
		}

		// Otherwise, we're toggling the block version
		const startMatch = blockRegex.start.exec(fromLine.text);
		const stopMatch = blockRegex.stop.exec(toLine.text);
		if (startMatch && stopMatch) {
			// Get start and stop indicies for the starting and ending matches
			const [fromMatchFrom, fromMatchTo] = getMatchEndPoints(startMatch, fromLine);
			const [toMatchFrom, toMatchTo] = getMatchEndPoints(stopMatch, toLine);


			// Delete content of the first line
			changes.push({
				from: fromMatchFrom,
				to: fromMatchTo,
			});
			charsAdded -= fromMatchTo - fromMatchFrom;

			// Delete content of the last line
			changes.push({
				from: toMatchFrom,
				to: toMatchTo,
			});
			charsAdded -= toMatchTo - toMatchFrom;
		} else {
			const insertBefore = `${blockTemplate.start}\n`;
			const insertAfter = `\n${blockTemplate.stop}`;
			changes.push({
				from: fromLine.from,
				insert: insertBefore,
			});

			changes.push({
				from: toLine.to,
				insert: insertAfter,
			});
			charsAdded += insertBefore.length + insertAfter.length;
		}

		return {
			changes,

			// Selection should now encompass all lines that were changed.
			range: EditorSelection.range(
				fromLine.from, Math.min(doc.length, toLine.to + charsAdded)
			),
		};
	});

	return changes;
};

// Toggles whether all lines in the user's selection start with [regex].
// [template] is that match of [regex] that is used when adding a match.
// [template] can also be a function that maps a given line to a string.
// If so, it is called on each line of a selection sequentially, starting
// with the first.
// If [matchEmpty], all lines **after the first** that have no non-space
// content are ignored.
// [nodeName], if given, is the name of the node to expand the selection
// to, (e.g. TaskList to expand selections to containing TaskLists if possible).
// Note that selection is only expanded if the existing selection is empty
// (just a caret).
const toggleSelectedLinesStartWith = (
	state: EditorState,
	regex: RegExp,
	template: string | ((line: Line, firstLine: Line, lastLine: Line)=> string),
	matchEmpty: boolean, nodeName?: string, ignoreBlockQuotes: boolean = true
): TransactionSpec => {
	const blockQuoteRegex = /^>\s(.*)$/;

	const getLineContentStart = (line: Line): number => {
		if (!ignoreBlockQuotes) {
			return line.from;
		}

		const blockQuoteMatch = blockQuoteRegex.exec(line.text);
		if (blockQuoteMatch) {
			return line.from + blockQuoteMatch.length;
		}

		return line.from;
	};

	const getLineContent = (line: Line): string => {
		const contentStart = getLineContentStart(line);
		return line.text.substring(contentStart - line.from);
	};

	const changes = state.changeByRange((sel: SelectionRange) => {
		// Attempt to select all lines in the region
		if (nodeName && sel.empty) {
			sel = growSelectionToNode(state, sel, nodeName);
		}

		const doc = state.doc;
		const fromLine = doc.lineAt(sel.from);
		const toLine = doc.lineAt(sel.to);
		let hasProp = false;
		let charsAdded = 0;

		const changes = [];
		const lines = [];

		for (let i = fromLine.number; i <= toLine.number; i++) {
			const line = doc.line(i);
			const text = getLineContent(line);

			// If already matching [regex],
			if (text.search(regex) == 0) {
				hasProp = true;
			}

			lines.push(line);
		}

		for (const line of lines) {
			const text = getLineContent(line);
			const contentFrom = getLineContentStart(line);

			// Only process if the line is non-empty.
			if (!matchEmpty && text.trim().length == 0
				// Treat the first line differently
				&& fromLine.number < line.number) {
				continue;
			}

			if (hasProp) {
				const match = text.match(regex);
				if (!match) {
					continue;
				}

				changes.push({
					from: contentFrom,
					to: contentFrom + match[0].length,
				});

				charsAdded -= match[0].length;
			} else {
				let templateVal;
				if (typeof template == 'string') {
					templateVal = template;
				} else {
					templateVal = template(line, fromLine, toLine);
				}

				changes.push({
					from: contentFrom,
					insert: templateVal,
				});

				charsAdded += templateVal.length;
			}
		}

		// If the selection is empty, don't grow it (user might be adding a
		// list/header, in which case, selecting the just added text isn't helpful)
		let newSel;
		if (sel.empty) {
			const regionEnd = toLine.to + charsAdded;
			newSel = EditorSelection.range(regionEnd, regionEnd);
		} else {
			newSel = EditorSelection.range(fromLine.from, toLine.to + charsAdded);
		}

		return {
			changes,

			// Selection should now encompass all lines that were changed.
			range: newSel,
		};
	});

	return changes;
};

// Bolds/unbolds the current selection.
export const toggleBolded: Command = (view: EditorView): boolean => {
	logMessage('Toggling bolded!');

	const changes = toggleGlobalSelectionFormat(view.state, 'StrongEmphasis', new RegionSpec({
		templateStart: '**',
		templateStop: '**',
	}));

	view.dispatch(changes);
	return true;
};

// Italicizes/deitalicizes the current selection.
export const toggleItalicized: Command = (view: EditorView): boolean => {
	logMessage('Toggling italicized!');

	const changes = toggleGlobalSelectionFormat(view.state, 'Emphasis', new RegionSpec({
		// Template start/end
		templateStart: '*',
		templateStop: '*',

		// Regular expressions that match all possible start/ends
		startExp: /[_*]/g,
		stopExp: /[_*]/g,
	}));
	view.dispatch(changes);

	return true;
};

export const toggleCode: Command = (view: EditorView): boolean => {
	logMessage('Toggling code!');

	const codeFenceRegex = /^```\w*\s*$/;
	const inlineRegionSpec = new RegionSpec({
		templateStart: '`',
		templateStop: '`',
	});

	const changes = toggleRegionFormat(
		view.state,
		'InlineCode', inlineRegionSpec,

		'FencedCode', { start: codeFenceRegex, stop: codeFenceRegex },
		{ start: '```', stop: '```' }
	);
	view.dispatch(changes);
	return true;
};

export const toggleMath: Command = (view: EditorView): boolean => {
	logMessage('Toggling math!');

	const blockStartRegex = /^\$\$/;
	const blockStopRegex = /\$\$\s*$/;
	const inlineRegionSpec = new RegionSpec({
		templateStart: '$',
		templateStop: '$',
	});

	const changes = toggleRegionFormat(
		view.state,
		'InlineMath', inlineRegionSpec,

		'BlockMath', { start: blockStartRegex, stop: blockStopRegex },
		{ start: '$$', stop: '$$' }
	);
	view.dispatch(changes);

	return true;
};

export const toggleList = (listType: ListType): Command => {
	return (view: EditorView): boolean => {
		logMessage('Toggling list!');

		const listTypes = [ListType.OrderedList, ListType.UnorderedList, ListType.CheckList];

		// `(?!\[[ xX]+\]\s?)` means "not followed by [x] or [ ]".
		const bulletedRegex = /^\s*[-*](?!\s\[[ xX]+\])\s?/;
		const checklistRegex = /^\s*[-*]\s\[[ xX]+\]\s?/;
		const numberedRegex = /^\s*\d+\.\s?/;

		const listRegexes: Record<ListType, RegExp> = {
			[ListType.OrderedList]: numberedRegex,
			[ListType.CheckList]: checklistRegex,
			[ListType.UnorderedList]: bulletedRegex,
		};
		const listTags = {
			[ListType.OrderedList]: 'OrderedList',

			// Both checklists and unordered lists use the BulletList
			// node as a container
			[ListType.CheckList]: 'BulletList',
			[ListType.UnorderedList]: 'BulletList',
		};
		const thisListTypeRegex = listRegexes[listType];
		const thisTag = listTags[listType];

		let changes: TransactionSpec;

		// Select the current list type, if possible.
		changes = growAllSelectionsToNodes(view.state, thisTag, (sel) => sel.empty);
		view.dispatch(changes);

		// Ignore empty lines
		const matchEmpty = false;

		// Remove existing formatting matching other list types.
		const replacementUpdates: TransactionSpec[] = [];
		for (const kind of listTypes) {
			if (kind == listType) {
				continue;
			}

			// Remove the contianing list, if it exists.
			replacementUpdates.push(toggleSelectedLinesStartWith(
				view.state,
				listRegexes[kind],
				'',
				matchEmpty,
				listTags[kind]
			));
		}
		view.dispatch(...replacementUpdates);

		let lineIdx = 0;
		changes = toggleSelectedLinesStartWith(
			view.state,
			thisListTypeRegex,
			() => {
				if (listType == ListType.UnorderedList) {
					return ' - ';
				} else if (listType == ListType.CheckList) {
					return ' - [ ] ';
				}

				lineIdx++;
				return ` ${lineIdx}. `;
			},
			matchEmpty,
			thisTag
		);
		view.dispatch(changes);

		return true;
	};
};

export const toggleHeaderLevel = (level: number): Command => {
	return (view: EditorView): boolean => {
		logMessage(`Setting heading level to ${level}`);

		let headerStr = '';
		for (let i = 0; i < level; i++) {
			headerStr += '#';
		}

		const matchEmpty = true;
		// Remove header formatting for any other level
		let changes = toggleSelectedLinesStartWith(
			view.state,
			new RegExp(
				// Check all numbers of #s lower than [level]
				`${level - 1 >= 1 ? `(?:^[#]{1,${level - 1}}\\s)|` : ''

				// Check all number of #s higher than [level]
				}(?:^[#]{${level + 1},}\\s)`
			),
			'',
			matchEmpty
		);
		view.dispatch(changes);

		// Set to the proper header level
		changes = toggleSelectedLinesStartWith(
			view.state,
			// We want exactly [level] '#' characters.
			new RegExp(`^[#]{${level}} `),
			`${headerStr} `,
			matchEmpty
		);
		view.dispatch(changes);

		return true;
	};
};

export const increaseIndent: Command = (view: EditorView): boolean => {
	logMessage('Increasing indentation.');
	const matchEmpty = true;
	const matchNothing = /$ ^/;

	const changes = toggleSelectedLinesStartWith(
		view.state,
		// Add a tab to the beginning of all lines
		matchNothing,
		// Always indent with a tab
		'\t',
		matchEmpty
	);
	view.dispatch(changes);

	return true;
};

export const decreaseIndent: Command = (editor: EditorView): boolean => {
	logMessage('Decreasing indentation.');
	const matchEmpty = true;
	const changes = toggleSelectedLinesStartWith(
		editor.state,
		// Assume indentation is either a tab or in units
		// of four spaces.
		/^(?:[\t]|[ ]{1,4})/,
		// Don't add new text
		'',
		matchEmpty
	);

	editor.dispatch(changes);
	return true;
};

// Create a new link with [label] and [url], or, if a link is either partially
// or fully selected, update the label and URL of that link.
export const updateLink = (label: string, url: string): Command => {
	const linkText = `[${label}](${url})`;

	return (editor: EditorView): boolean => {
		const transaction = editor.state.changeByRange((sel: SelectionRange) => {
			const changes = [];

			// Search for a link that overlaps [sel]
			let linkFrom: number | null = null;
			let linkTo: number | null = null;
			syntaxTree(editor.state).iterate({
				from: sel.from, to: sel.to,
				enter: node => {
					const haveFoundLink = (linkFrom != null && linkTo != null);

					if (node.name == 'Link' || (node.name == 'URL' && !haveFoundLink)) {
						linkFrom = node.from;
						linkTo = node.to;
					}
				},
			});

			if (linkFrom == null || linkTo == null) {
				linkFrom = sel.from;
				linkTo = sel.to;
			}

			changes.push({
				from: linkFrom, to: linkTo,
				insert: linkText,
			});

			return {
				changes,
				range: EditorSelection.range(linkFrom, linkFrom + linkText.length),
			};
		});

		editor.dispatch(transaction);
		return true;
	};
};
