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
import stripBlockquote from '../utils/markdown/stripBlockquote';
import renumberSelectedLists from '../utils/markdown/renumberSelectedLists';
import toggleSelectedLinesStartWith from '../utils/formatting/toggleSelectedLinesStartWith';


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
	enum ListAction {
		AddList,
		RemoveList,
		SwitchFormatting,
	}

	return (view: EditorView): boolean => {
		const state = view.state;
		const doc = state.doc;

		const bulletedRegex = /^\s*([-*])\s(?!\[[ xX]+\]\s)/;
		const checklistRegex = /^\s*[-*]\s\[[ xX]+\]\s/;
		const numberedRegex = /^\s*\d+\.\s/;
		const startingSpaceRegex = /^\s*/;

		const listRegexes: Record<ListType, RegExp> = {
			[ListType.OrderedList]: numberedRegex,
			[ListType.CheckList]: checklistRegex,
			[ListType.UnorderedList]: bulletedRegex,
		};

		const getContainerType = (line: Line): ListType | null => {
			const lineContent = stripBlockquote(line);
			if (lineContent.match(checklistRegex)) return ListType.CheckList;
			if (lineContent.match(bulletedRegex)) return ListType.UnorderedList;
			if (lineContent.match(numberedRegex)) return ListType.OrderedList;
			return null;
		};

		// Maximum line number in the original document that has
		// been processed
		let maximumChangedLine = -1;
		const getNextLineRange = (sel: SelectionRange) => {
			let fromLine = doc.lineAt(sel.from);
			const toLine = doc.lineAt(sel.to);

			// Full selection already processed.
			if (toLine.number <= maximumChangedLine) {
				return null;
			}

			if (fromLine.number <= maximumChangedLine) {
				fromLine = doc.line(maximumChangedLine);
			}
			maximumChangedLine = toLine.number;

			return { fromLine, toLine };
		};

		const getIndent = (line: Line) => {
			const content = stripBlockquote(line);
			return (content.match(startingSpaceRegex)?.[0] || '').length;
		};

		const getBaselineIndent = (fromLine: Line, toLine: Line) => {
			let baselineIndent = Infinity;
			for (let lineNum = fromLine.number; lineNum <= toLine.number; lineNum++) {
				const line = doc.line(lineNum);
				const content = stripBlockquote(line);
				if (content.trim() !== '') {
					baselineIndent = Math.min(baselineIndent, getIndent(line));
				}
			}
			if (baselineIndent === Infinity) baselineIndent = 0;

			return baselineIndent;
		};

		const getFirstBaselineIndentLine = (fromLine: Line, toLine: Line) => {
			const baselineIndent = getBaselineIndent(fromLine, toLine);
			for (let lineNum = fromLine.number; lineNum <= toLine.number; lineNum++) {
				const line = doc.line(lineNum);
				const content = stripBlockquote(line);
				if (content.trim() === '') continue;

				const indent = getIndent(line);
				if (indent === baselineIndent) {
					return line;
				}
			}
			return fromLine;
		};

		const getAction = (fromLine: Line, toLine: Line) => {
			const firstLine = getFirstBaselineIndentLine(fromLine, toLine);

			const currentListType = getContainerType(firstLine);
			if (currentListType === null) {
				return ListAction.AddList;
			} else if (currentListType === listType) {
				return ListAction.RemoveList;
			}
			return ListAction.SwitchFormatting;
		};

		const areAllLinesBlankInRange = (fromLine: Line, toLine: Line) => {
			for (let lineNumber = fromLine.number; lineNumber <= toLine.number; lineNumber++) {
				const line = state.doc.line(lineNumber);

				// Consider lines within block quotes with no other content to be blank (this
				// command should behave similarly regardless of whether in or out of a block
				// quote).
				if (stripBlockquote(line).trim() !== '') {
					return false;
				}
			}

			return true;
		};

		const changes: TransactionSpec = state.changeByRange((sel: SelectionRange) => {
			const lineRange = getNextLineRange(sel);
			if (!lineRange) return { range: sel };
			const { fromLine, toLine } = lineRange;
			const baselineIndent = getBaselineIndent(fromLine, toLine);
			const action = getAction(fromLine, toLine);
			const allLinesBlank = areAllLinesBlankInRange(fromLine, toLine);

			// Outermost list item number
			let outerCounter = 1;
			// Stack mapping parent indentation to item numbers
			const stack: { indent: number; counter: number }[] = [];
			const changes: ChangeSpec[] = [];
			let charsAdded = 0;

			for (let lineNum = fromLine.number; lineNum <= toLine.number; lineNum++) {
				const line = doc.line(lineNum);
				const origLineContent = stripBlockquote(line);
				const currentLineBlank = origLineContent.trim() === '';

				// To support changing the formatting of non-tight lists, skip blank lines within
				// larger content. This allows changing the list format without adding a potentially
				// large number of empty list items.
				//
				// However, if all lines are blank (e.g. if the cursor at the beginning of an empty)
				// document, we're not changing the formatting of an existing list. In this case,
				// skipping blank lines would cause the command to do nothing.
				// See https://github.com/laurent22/joplin/pull/12745.
				if (currentLineBlank && !allLinesBlank) {
					continue;
				}

				// Content excluding the block quote start
				const lineContentFrom = line.to - origLineContent.length;
				const indentation = origLineContent.match(startingSpaceRegex)?.[0] || '';
				const currentIndent = indentation.length;
				const normalizedIndent = currentIndent - baselineIndent;

				const currentContainer = getContainerType(line);
				const deleteFrom = lineContentFrom;
				let deleteTo = deleteFrom + indentation.length;
				let isAlreadyListItem = false;
				if (currentContainer !== null) {
					const containerRegex = listRegexes[currentContainer];
					const containerMatch = origLineContent.match(containerRegex);
					if (containerMatch) {
						deleteTo = lineContentFrom + containerMatch[0].length;
						isAlreadyListItem = true;
					}
				}

				let replacementString = indentation;
				if (action === ListAction.AddList || action === ListAction.SwitchFormatting) {
					if (action === ListAction.SwitchFormatting && !isAlreadyListItem) {
						// Skip replacement if the line didn't previously have list formatting
						deleteTo = deleteFrom;
						replacementString = '';
					} else if (listType === ListType.OrderedList) {
						if (normalizedIndent <= 0) {
							// Top-level item
							stack.length = 0;
							replacementString = `${indentation}${outerCounter}. `;
							outerCounter++;
						} else {
							// Nested item
							while (stack.length && stack[stack.length - 1].indent > currentIndent) {
								stack.pop();
							}
							if (!stack.length || stack[stack.length - 1].indent < currentIndent) {
								stack.push({ indent: currentIndent, counter: 1 });
							}
							const currentLevel = stack[stack.length - 1];
							replacementString = `${indentation}${currentLevel.counter}. `;
							currentLevel.counter++;
						}
					} else if (listType === ListType.CheckList) {
						replacementString = `${indentation}- [ ] `;
					} else if (listType === ListType.UnorderedList) {
						replacementString = `${indentation}- `;
					}
				}

				changes.push({
					from: deleteFrom,
					to: deleteTo,
					insert: replacementString,
				});
				charsAdded -= deleteTo - deleteFrom;
				charsAdded += replacementString.length;
			}

			const newSelection = sel.empty
				? EditorSelection.cursor(toLine.to + charsAdded)
				: EditorSelection.range(sel.from, sel.to + charsAdded);
			return { changes, range: newSelection };
		});

		view.dispatch(changes);
		// Fix any selected lists. Do this as a separate .dispatch
		// so that it can be undone separately.
		view.dispatch(renumberSelectedLists(view.state));

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
