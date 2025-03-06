// CodeMirror 6 commands that modify markdown formatting (e.g. toggleBold).

import { EditorView, Command } from '@codemirror/view';

import { ListType } from '../../types';
import {
	SelectionRange, EditorSelection, ChangeSpec, Line, TransactionSpec,
} from '@codemirror/state';
import { getIndentUnit, indentString, syntaxTree } from '@codemirror/language';
import intersectsSyntaxNode from '../utils/isInSyntaxNode';
import toggleRegionFormatGlobally from '../utils/formatting/toggleRegionFormatGlobally';
import { RegionSpec } from '../utils/formatting/RegionSpec';
import toggleInlineFormatGlobally from '../utils/formatting/toggleInlineFormatGlobally';
import stripBlockquote from './utils/stripBlockquote';
import isIndentationEquivalent from '../utils/formatting/isIndentationEquivalent';
import growSelectionToNode from '../utils/growSelectionToNode';
import tabsToSpaces from '../utils/formatting/tabsToSpaces';
import renumberSelectedLists from './utils/renumberSelectedLists';
import toggleSelectedLinesStartWith from '../utils/formatting/toggleSelectedLinesStartWith';

const startingSpaceRegex = /^(\s*)/;

export const toggleBolded: Command = (view: EditorView): boolean => {
	const spec = RegionSpec.of({ template: '**', nodeName: 'StrongEmphasis' });
	const changes = toggleInlineFormatGlobally(view.state, spec);

	view.dispatch(changes);
	return true;
};

export const toggleItalicized: Command = (view: EditorView): boolean => {
	let handledBoldItalicRegion = false;

	// Bold-italic regions' starting and ending patterns are similar to italicized regions.
	// Thus, we need additional logic to convert bold regions to bold-italic regions.
	view.dispatch(view.state.changeByRange((sel: SelectionRange) => {
		const changes: ChangeSpec[] = [];

		// Only handle cursors (empty selections)
		if (sel.empty) {
			const doc = view.state.doc;
			const selLine = doc.lineAt(sel.from);

			const selStartLineIdx = sel.from - selLine.from;
			const selEndLineIdx = sel.to - selLine.from;
			const beforeSel = selLine.text.substring(0, selStartLineIdx);
			const afterSel = selLine.text.substring(selEndLineIdx);

			const isBolded = beforeSel.endsWith('**') && afterSel.startsWith('**');

			// If at the end of a bold-italic region, exit the region.
			if (afterSel.startsWith('***')) {
				sel = EditorSelection.cursor(sel.to + 3);
				handledBoldItalicRegion = true;
			} else if (isBolded) {
				// Create a bold-italic region.
				changes.push({
					from: sel.from,
					to: sel.to,
					insert: '**',
				});

				// Move to the center of the bold-italic region (**|**** -> ***|***)
				sel = EditorSelection.cursor(sel.to + 1);
				handledBoldItalicRegion = true;
			}
		}

		return {
			changes,
			range: sel,
		};
	}));

	if (!handledBoldItalicRegion) {
		const changes = toggleInlineFormatGlobally(view.state, {
			nodeName: 'Emphasis',

			template: { start: '*', end: '*' },
			matcher: { start: /[_*]/g, end: /[_*]/g },
		});
		view.dispatch(changes);
	}

	return true;
};

// If the selected region is an empty inline code block, it will be converted to
// a block (fenced) code block.
export const toggleCode: Command = (view: EditorView): boolean => {
	const codeFenceRegex = /^```\w*\s*$/;
	const inlineRegionSpec = RegionSpec.of({ template: '`', nodeName: 'InlineCode' });
	const blockRegionSpec: RegionSpec = {
		nodeName: 'FencedCode',
		template: { start: '```', end: '```' },
		matcher: { start: codeFenceRegex, end: codeFenceRegex },
	};

	const changes = toggleRegionFormatGlobally(view.state, inlineRegionSpec, blockRegionSpec);
	view.dispatch(changes);

	return true;
};

export const toggleMath: Command = (view: EditorView): boolean => {
	const blockStartRegex = /^\$\$/;
	const blockEndRegex = /\$\$\s*$/;
	const inlineRegionSpec = RegionSpec.of({ nodeName: 'InlineMath', template: '$' });
	const blockRegionSpec = RegionSpec.of({
		nodeName: 'BlockMath',
		template: '$$',
		matcher: {
			start: blockStartRegex,
			end: blockEndRegex,
		},
	});

	const changes = toggleRegionFormatGlobally(view.state, inlineRegionSpec, blockRegionSpec);
	view.dispatch(changes);

	return true;
};

export const toggleList = (listType: ListType): Command => {
	return (view: EditorView): boolean => {
		let state = view.state;
		let doc = state.doc;

		const orderedListTag = 'OrderedList';
		const unorderedListTag = 'BulletList';

		// RegExps for different list types. The regular expressions MUST
		// be mutually exclusive.
		// `(?!\[[ xX]+\])` means "not followed by [x] or [ ]".
		const bulletedRegex = /^\s*([-*])\s(?!\[[ xX]+\]\s)/;
		const checklistRegex = /^\s*[-*]\s\[[ xX]+\]\s/;
		const numberedRegex = /^\s*\d+\.\s/;

		const listRegexes: Record<ListType, RegExp> = {
			[ListType.OrderedList]: numberedRegex,
			[ListType.CheckList]: checklistRegex,
			[ListType.UnorderedList]: bulletedRegex,
		};

		const getContainerType = (line: Line): ListType|null => {
			const lineContent = stripBlockquote(line);

			// Determine the container's type.
			const checklistMatch = lineContent.match(checklistRegex);
			const bulletListMatch = lineContent.match(bulletedRegex);
			const orderedListMatch = lineContent.match(numberedRegex);

			if (checklistMatch) {
				return ListType.CheckList;
			} else if (bulletListMatch) {
				return ListType.UnorderedList;
			} else if (orderedListMatch) {
				return ListType.OrderedList;
			}

			return null;
		};

		const changes: TransactionSpec = state.changeByRange((sel: SelectionRange) => {
			const changes: ChangeSpec[] = [];
			let containerType: ListType|null = null;

			// Total number of characters added (deleted if negative)
			let charsAdded = 0;

			const originalSel = sel;
			let fromLine: Line;
			let toLine: Line;
			let firstLineIndentation: string;
			let firstLineInBlockQuote: boolean;
			let fromLineContent: string;
			const computeSelectionProps = () => {
				fromLine = doc.lineAt(sel.from);
				toLine = doc.lineAt(sel.to);
				fromLineContent = stripBlockquote(fromLine);
				firstLineIndentation = fromLineContent.match(startingSpaceRegex)[0];
				firstLineInBlockQuote = (fromLineContent !== fromLine.text);

				containerType = getContainerType(fromLine);
			};
			computeSelectionProps();

			const origFirstLineIndentation = firstLineIndentation;
			const origContainerType = containerType;

			// Grow `sel` to the smallest containing list, unless the
			// cursor is on an empty line, in which case, the user
			// probably wants to add a list item (and not select the entire
			// list).
			if (sel.empty && fromLine.text.trim() !== '') {
				sel = growSelectionToNode(state, sel, [orderedListTag, unorderedListTag]);
				computeSelectionProps();
			}

			// Reset the selection if it seems likely the user didn't want the selection
			// to be expanded
			const isIndentationDiff =
				!isIndentationEquivalent(state, firstLineIndentation, origFirstLineIndentation);
			if (isIndentationDiff) {
				const expandedRegionIndentation = firstLineIndentation;
				sel = originalSel;
				computeSelectionProps();

				// Use the indentation level of the expanded region if it's greater.
				// This makes sense in the case where unindented text is being converted to
				// the same type of list as its container. For example,
				//     1. Foobar
				// unindented text
				// that should be made a part of the above list.
				//
				// becoming
				//
				//     1. Foobar
				//     2. unindented text
				//     3. that should be made a part of the above list.
				const wasGreaterIndentation = (
					tabsToSpaces(state, expandedRegionIndentation).length
						> tabsToSpaces(state, firstLineIndentation).length
				);
				if (wasGreaterIndentation) {
					firstLineIndentation = expandedRegionIndentation;
				}
			} else if (
				(origContainerType !== containerType && (origContainerType ?? null) !== null)
					|| containerType !== getContainerType(toLine)
			) {
				// If the container type changed, this could be an artifact of checklists/bulleted
				// lists sharing the same node type.
				// Find the closest range of the same type of list to the original selection
				let newFromLineNo = doc.lineAt(originalSel.from).number;
				let newToLineNo = doc.lineAt(originalSel.to).number;
				let lastFromLineNo;
				let lastToLineNo;

				while (newFromLineNo !== lastFromLineNo || newToLineNo !== lastToLineNo) {
					lastFromLineNo = newFromLineNo;
					lastToLineNo = newToLineNo;

					if (lastFromLineNo - 1 >= 1) {
						const testFromLine = doc.line(lastFromLineNo - 1);
						if (getContainerType(testFromLine) === origContainerType) {
							newFromLineNo --;
						}
					}

					if (lastToLineNo + 1 <= doc.lines) {
						const testToLine = doc.line(lastToLineNo + 1);
						if (getContainerType(testToLine) === origContainerType) {
							newToLineNo ++;
						}
					}
				}

				sel = EditorSelection.range(
					doc.line(newFromLineNo).from,
					doc.line(newToLineNo).to,
				);
				computeSelectionProps();
			}

			// Determine whether the expanded selection should be empty
			if (originalSel.empty && fromLine.number === toLine.number) {
				sel = EditorSelection.cursor(toLine.to);
			}

			// Select entire lines (if not just a cursor)
			if (!sel.empty) {
				sel = EditorSelection.range(fromLine.from, toLine.to);
			}

			// Number of the item in the list (e.g. 2 for the 2nd item in the list)
			let listItemCounter = 1;
			for (let lineNum = fromLine.number; lineNum <= toLine.number; lineNum ++) {
				const line = doc.line(lineNum);
				const lineContent = stripBlockquote(line);
				const lineContentFrom = line.to - lineContent.length;
				const inBlockQuote = (lineContent !== line.text);
				const indentation = lineContent.match(startingSpaceRegex)[0];

				const wrongIndentation = !isIndentationEquivalent(state, indentation, firstLineIndentation);

				// If not the right list level,
				if (inBlockQuote !== firstLineInBlockQuote || wrongIndentation) {
					// We'll be starting a new list
					listItemCounter = 1;
					continue;
				}

				// Don't add list numbers to otherwise empty lines (unless it's the first line)
				if (lineNum !== fromLine.number && line.text.trim().length === 0) {
					// Do not reset the counter -- the markdown renderer doesn't!
					continue;
				}

				const deleteFrom = lineContentFrom;
				let deleteTo = deleteFrom + indentation.length;

				// If we need to remove an existing list,
				const currentContainer = getContainerType(line);
				if (currentContainer !== null) {
					const containerRegex = listRegexes[currentContainer];
					const containerMatch = lineContent.match(containerRegex);
					if (!containerMatch) {
						throw new Error(
							'Assertion failed: container regex does not match line content.',
						);
					}

					deleteTo = lineContentFrom + containerMatch[0].length;
				}

				let replacementString;

				if (listType === containerType) {
					// Delete the existing list if it's the same type as the current
					replacementString = '';
				} else if (listType === ListType.OrderedList) {
					replacementString = `${firstLineIndentation}${listItemCounter}. `;
				} else if (listType === ListType.CheckList) {
					replacementString = `${firstLineIndentation}- [ ] `;
				} else {
					replacementString = `${firstLineIndentation}- `;
				}

				changes.push({
					from: deleteFrom,
					to: deleteTo,
					insert: replacementString,
				});
				charsAdded -= deleteTo - deleteFrom;
				charsAdded += replacementString.length;
				listItemCounter++;
			}

			// Don't change cursors to selections
			if (sel.empty) {
				// Position the cursor at the end of the last line modified
				sel = EditorSelection.cursor(toLine.to + charsAdded);
			} else {
				sel = EditorSelection.range(
					sel.from,
					sel.to + charsAdded,
				);
			}

			return {
				changes,
				range: sel,
			};
		});
		view.dispatch(changes);
		state = view.state;
		doc = state.doc;

		// Renumber the list
		view.dispatch(renumberSelectedLists(state));

		return true;
	};
};

export const toggleHeaderLevel = (level: number): Command => {
	return (view: EditorView): boolean => {
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
				}(?:^[#]{${level + 1},}\\s)`,
			),
			'',
			matchEmpty,
		);
		view.dispatch(changes);

		// Set to the proper header level
		changes = toggleSelectedLinesStartWith(
			view.state,
			// We want exactly [level] '#' characters.
			new RegExp(`^[#]{${level}} `),
			`${headerStr} `,
			matchEmpty,
		);
		view.dispatch(changes);

		return true;
	};
};

export const insertHorizontalRule: Command = (view: EditorView) => {
	view.dispatch(view.state.changeByRange(selection => {
		const line = view.state.doc.lineAt(selection.to);
		const processedLineText = stripBlockquote(line);
		const inBlockQuote = processedLineText !== line.text;
		const needsNewLine = processedLineText !== '';

		let prefix = inBlockQuote && needsNewLine ? '> ' : '';
		if (needsNewLine) {
			prefix = `\n${prefix}`;
		}
		const insert = `${prefix}* * *`;

		return {
			range: EditorSelection.cursor(line.to + insert.length),
			changes: {
				from: line.to,
				insert,
			},
		};
	}));
	return true;
};

// Prepends the given editor's indentUnit to all lines of the current selection
// and re-numbers modified ordered lists (if any).
export const increaseIndent: Command = (view: EditorView): boolean => {
	const matchEmpty = true;
	const matchNothing = /$ ^/;
	const indentUnit = indentString(view.state, getIndentUnit(view.state));

	const changes = toggleSelectedLinesStartWith(
		view.state,
		// Delete nothing
		matchNothing,
		// ...and thus always add indentUnit.
		indentUnit,
		matchEmpty,
	);
	view.dispatch(changes);

	// Fix any lists
	view.dispatch(renumberSelectedLists(view.state));

	return true;
};

// Like `increaseIndent`, but may insert tabs, rather than
// indenting, in some instances.
export const insertOrIncreaseIndent: Command = (view: EditorView): boolean => {
	const selection = view.state.selection;
	const mainSelection = selection.main;
	if (selection.ranges.length !== 1 || !mainSelection.empty) {
		return increaseIndent(view);
	}


	if (intersectsSyntaxNode(view.state, mainSelection, 'ListItem')) {
		return increaseIndent(view);
	}

	const indentUnit = indentString(view.state, getIndentUnit(view.state));
	view.dispatch(view.state.changeByRange(selection => {
		return {
			// Move the selection to after the inserted text
			range: EditorSelection.cursor(selection.from + indentUnit.length),
			changes: {
				from: selection.from,
				insert: indentUnit,
			},
		};
	}));

	return true;
};

export const decreaseIndent: Command = (view: EditorView): boolean => {
	const matchEmpty = true;
	const changes = toggleSelectedLinesStartWith(
		view.state,
		// Assume indentation is either a tab or in units
		// of n spaces.
		new RegExp(`^(?:[\\t]|[ ]{1,${getIndentUnit(view.state)}})`),
		// Don't add new text
		'',
		matchEmpty,
	);

	view.dispatch(changes);

	// Fix any lists
	view.dispatch(renumberSelectedLists(view.state));

	return true;
};

export const updateLink = (label: string, url: string): Command => {
	// Empty label? Just include the URL.
	const linkText = label === '' ? url : `[${label}](${url})`;

	return (editor: EditorView): boolean => {
		const transaction = editor.state.changeByRange((sel: SelectionRange) => {
			const changes = [];

			// Search for a link that overlaps [sel]
			let linkFrom: number | null = null;
			let linkTo: number | null = null;
			syntaxTree(editor.state).iterate({
				from: sel.from, to: sel.to,
				enter: node => {
					const haveFoundLink = (linkFrom !== null && linkTo !== null);

					if (node.name === 'Link' || (node.name === 'URL' && !haveFoundLink)) {
						linkFrom = node.from;
						linkTo = node.to;
					}
				},
			});

			linkFrom ??= sel.from;
			linkTo ??= sel.to;

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
