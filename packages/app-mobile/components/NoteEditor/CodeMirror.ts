/* eslint-disable import/prefer-default-export */

// This contains the CodeMirror instance, which needs to be built into a bundle
// using `npm run buildInjectedJs`. This bundle is then loaded from
// NoteEditor.tsx into the webview.
//
// In general, since this file is harder to debug due to the intermediate built
// step, it's better to keep it as light as possible - it shoud just be a light
// wrapper to access CodeMirror functionalities. Anything else should be done
// from NoteEditor.tsx.

import { SelectionFormatting } from './EditorType';
import MarkdownTeXParser from './MarkdownTeXParser';

import { EditorState, Extension, Line } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { highlightSelectionMatches, search } from '@codemirror/search';
import { defaultHighlightStyle, syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { GFM } from '@lezer/markdown';
import { EditorView, drawSelection, highlightSpecialChars, ViewUpdate, KeyBinding } from '@codemirror/view';
import { undo, redo, history, undoDepth, redoDepth } from '@codemirror/commands';

import { keymap } from '@codemirror/view';
import { indentOnInput, syntaxTree } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { historyKeymap, defaultKeymap } from '@codemirror/commands';

import { SelectionRange, EditorSelection, ChangeSpec } from '@codemirror/state';
import { Text as DocumentText } from '@codemirror/state';

interface CodeMirrorResult {
	editor: EditorView;
	undo: Function;
	redo: Function;
	select: (anchor: number, head: number)=> void;
	insertText: (text: string)=> void;
}

// Specifies the update of a single selection region and its contents
type SelectionUpdate = { range: SelectionRange; changes?: ChangeSpec };

// Specifies a type of formatting region in Markdown
class RegionSpec {
	// Patterns to use when creating an instance of the tag.
	// E.g.
	//   templateStart=**
	//   templateStop=**
	//  would be used to create
	//   **content here**
	public templateStart: string;
	public templateStop: string;

	// Size of the buffer used to check for a match.
	// Particularly useful for [startExp], [stopExp].
	// Only used when the selection is empty.
	protected startBuffSize: number;
	protected stopBuffSize: number;

	// Regular expressions for matching possible starting/stopping
	// regions.
	protected startExp?: RegExp;
	protected stopExp?: RegExp;

	public constructor({
		templateStart, templateStop,
		startExp, stopExp,
		startBuffSize, stopBuffSize,
	}: {
			templateStart: string; templateStop: string;
			startExp?: RegExp; stopExp?: RegExp;
			startBuffSize?: number; stopBuffSize?: number;
	}) {
		this.templateStart = templateStart;
		this.templateStop = templateStop;
		this.startExp = startExp;
		this.stopExp = stopExp;
		this.startBuffSize = startBuffSize ?? this.templateStart.length;
		this.stopBuffSize = stopBuffSize ?? this.templateStop.length;
	}


	// Returns the length of a match for this in [searchText], matching either
	// [template] or [regex], starting at [startIndex] or ending at [endIndex].
	// Note that the [regex], if provided, must have the global flag enabled.
	private matchLen({
		searchText, template, startIndex, endIndex, regex,
	}: {
		searchText: string; template: string;
		startIndex: number; endIndex: number; regex?: RegExp;
	}): number {
		let matchLength, matchIndex;

		// Returns true if [idx] is in the right place (the match is at
		// the end of the string or the beginning based on startIndex/endIndex).
		const indexSatisfies = (idx: number, len: number): boolean => {
			return (startIndex == -1 || idx == startIndex)
				&& (endIndex == -1 || idx == endIndex - len);
		};

		if (regex) {
			// Enforce 'g' flag.
			if (regex.flags.indexOf('g') == -1) {
				throw new Error('Regular expressions used by RegionSpec must have the global flag!');
			}

			// Search from the beginning.
			regex!.lastIndex = 0;

			let foundMatch = null;
			let match;
			while ((match = regex!.exec(searchText)) !== null) {
				if (indexSatisfies(match.index, match[0].length)) {
					foundMatch = match;
					break;
				}
			}

			if (!foundMatch) {
				return -1;
			}

			matchLength = foundMatch[0].length;
			matchIndex = foundMatch.index;
		} else {
			if (startIndex != -1) {
				matchIndex = searchText.indexOf(template);
			} else {
				matchIndex = searchText.lastIndexOf(template);
			}

			if (matchIndex == -1) {
				return -1;
			}

			matchLength = template.length;
		}
		// If the match isn't in the right place,
		if (!indexSatisfies(matchIndex, matchLength)) {
			return -1;
		}

		return matchLength;
	}

	// If [sel].empty,
	//   returns the length of a match for this that precedes [sel].
	//   returns -1 if no match is found.
	// Else,
	//   returns the length of the match in the region containing [sel]
	public matchStart(doc: DocumentText, sel: SelectionRange): number {
		let searchText;
		if (sel.empty) {
			searchText = doc.sliceString(sel.from - this.startBuffSize, sel.from);
		} else {
			searchText = doc.sliceString(sel.from, sel.to);
		}

		return this.matchLen({
			searchText,
			template: this.templateStart,
			startIndex: 0,
			endIndex: -1,
			regex: this.startExp,
		});
	}

	public matchStop(doc: DocumentText, sel: SelectionRange): number {
		let searchText;
		if (sel.empty) {
			searchText = doc.sliceString(sel.to, sel.to + this.stopBuffSize);
		} else {
			searchText = doc.sliceString(sel.from, sel.to);
		}

		return this.matchLen({
			searchText,
			template: this.templateStop,
			startIndex: -1,
			endIndex: searchText.length,
			regex: this.stopExp,
		});
	}

	// Lightweight tests.
	public static _test() {
		const fail = (reason: string) => {
			logMessage('Test failed!', reason);
			throw new Error(`Test failure: ${reason}`);
		};
		const failIfNeq = (a: any, b: any, reason: string) => {
			if (a != b) {
				fail(`${reason} (${a as string} != ${b as string})`);
			}
		};

		let spec = new RegionSpec({
			templateStart: '**',
			templateStop: '**',
		});
		failIfNeq(
			spec.matchStart(DocumentText.of(['**test**']), EditorSelection.range(0, 5)), 2,
			'Bolded/matchStart failed'
		);
		failIfNeq(
			spec.matchStop(DocumentText.of(['**...** test.']), EditorSelection.range(5, 5)), 2,
			'Bolded/matchStop (single caret) failed'
		);
		failIfNeq(
			spec.matchStop(DocumentText.of(['**...** test.']), EditorSelection.range(3, 3)), -1,
			'Bolded/nomatch(single caret) failed'
		);

		spec = new RegionSpec({
			templateStart: '*',
			templateStop: '*',
			startExp: /[*_]/g,
			stopExp: /[*_]/g,
		});
		const testString = 'This is a _test_';
		const testSel = EditorSelection.range('This is a '.length, testString.length);
		failIfNeq(
			spec.matchStart(DocumentText.of([testString]), testSel), 1,
			'Italicized/matchStart (full selection) failed'
		);
		failIfNeq(
			spec.matchStop(DocumentText.of([testString]), testSel), 1,
			'Italicized/matchStop (full selection) failed'
		);

		spec = new RegionSpec({
			templateStart: ' - ',
			templateStop: '',
			startBuffSize: 4,
			startExp: /^\s*[-*]\s/g,
		});
		failIfNeq(
			spec.matchStart(DocumentText.of(['- Test...']), EditorSelection.range(1, 6)), -1,
			'List region spec/no matchStart (simple) failure!'
		);
		failIfNeq(
			spec.matchStart(DocumentText.of(['- Test...']), EditorSelection.range(0, 6)), 2,
			'List region spec/matchStart (simple) failure!'
		);
		failIfNeq(
			spec.matchStart(DocumentText.of(['   - Test...']), EditorSelection.range(0, 6)), 5,
			'List region spec/matchStart failure!'
		);
		failIfNeq(
			spec.matchStop(DocumentText.of(['   - Test...']), EditorSelection.range(0, 100)), 0,
			'List region spec/matchStop failure!'
		);
	}
}

RegionSpec._test();


function postMessage(name: string, data: any) {
	(window as any).ReactNativeWebView.postMessage(JSON.stringify({
		data,
		name,
	}));
}

function logMessage(...msg: any[]) {
	postMessage('onLog', { value: msg });
}

// For an example on how to customize the theme, see:
//
// https://github.com/codemirror/theme-one-dark/blob/main/src/one-dark.ts
//
// For a tutorial, see:
//
// https://codemirror.net/6/examples/styling/#themes
//
// Use Safari developer tools to view the content of the CodeMirror iframe while
// the app is running. It seems that what appears as ".ͼ1" in the CSS is the
// equivalent of "&" in the theme object. So to target ".ͼ1.cm-focused", you'd
// use '&.cm-focused' in the theme.
const createTheme = (theme: any): Extension[] => {
	const isDarkTheme = theme.appearance === 'dark';

	const baseGlobalStyle: Record<string, string> = {
		color: theme.color,
		backgroundColor: theme.backgroundColor,
		fontFamily: theme.fontFamily,
		fontSize: `${theme.fontSize}px`,
	};
	const baseCursorStyle: Record<string, string> = { };
	const baseContentStyle: Record<string, string> = { };
	const baseSelectionStyle: Record<string, string> = { };

	// If we're in dark mode, the caret and selection are difficult to see.
	// Adjust them appropriately
	if (isDarkTheme) {
		// Styling the caret requires styling both the caret itself
		// and the CodeMirror caret.
		// See https://codemirror.net/6/examples/styling/#themes
		baseContentStyle.caretColor = 'white';
		baseCursorStyle.borderLeftColor = 'white';

		baseSelectionStyle.backgroundColor = '#6b6b6b';
	}

	const baseTheme = EditorView.baseTheme({
		'&': baseGlobalStyle,

		// These must be !important or more specific than CodeMirror's built-ins
		'.cm-content': baseContentStyle,
		'&.cm-focused .cm-cursor': baseCursorStyle,
		'&.cm-focused .cm-selectionBackground, ::selection': baseSelectionStyle,

		'&.cm-focused': {
			outline: 'none',
		},
	});

	const appearanceTheme = EditorView.theme({}, { dark: isDarkTheme });

	const baseHeadingStyle = {
		fontWeight: 'bold',
		fontFamily: theme.fontFamily,
	};

	const highlightingStyle = HighlightStyle.define([
		{
			tag: tags.strong,
			fontWeight: 'bold',
		},
		{
			tag: tags.emphasis,
			fontStyle: 'italic',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading1,
			fontSize: '1.6em',
			borderBottom: `1px solid ${theme.dividerColor}`,
		},
		{
			...baseHeadingStyle,
			tag: tags.heading2,
			fontSize: '1.4em',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading3,
			fontSize: '1.3em',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading4,
			fontSize: '1.2em',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading5,
			fontSize: '1.1em',
		},
		{
			...baseHeadingStyle,
			tag: tags.heading6,
			fontSize: '1.0em',
		},
		{
			tag: tags.list,
			fontFamily: theme.fontFamily,
		},
		{
			tag: tags.comment,
			color: theme.color3,
			borderRadius: '4px',
			fontStyle: 'italic',
		},
		{
			tag: tags.link,
			color: theme.urlColor,
			textDecoration: 'underline',
		},
	]);

	return [
		baseTheme,
		appearanceTheme,
		syntaxHighlighting(highlightingStyle),

		// If we haven't defined highlighting for tags, fall back
		// to the default.
		syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
	];
};

export function initCodeMirror(parentElement: any, initialText: string, theme: any): CodeMirrorResult {
	logMessage('Initializing CodeMirror...');

	let schedulePostUndoRedoDepthChangeId_: any = 0;
	function schedulePostUndoRedoDepthChange(editor: EditorView, doItNow: boolean = false) {
		if (schedulePostUndoRedoDepthChangeId_) {
			if (doItNow) {
				clearTimeout(schedulePostUndoRedoDepthChangeId_);
			} else {
				return;
			}
		}

		schedulePostUndoRedoDepthChangeId_ = setTimeout(() => {
			schedulePostUndoRedoDepthChangeId_ = null;
			postMessage('onUndoRedoDepthChange', {
				undoDepth: undoDepth(editor.state),
				redoDepth: redoDepth(editor.state),
			});
		}, doItNow ? 0 : 1000);
	}

	function notifyDocChanged(viewUpdate: ViewUpdate) {
		if (viewUpdate.docChanged) {
			postMessage('onChange', { value: editor.state.doc.toString() });
			schedulePostUndoRedoDepthChange(editor);
		}
	}

	function notifySelectionChange(viewUpdate: ViewUpdate) {
		if (!viewUpdate.state.selection.eq(viewUpdate.startState.selection)) {
			const mainRange = viewUpdate.state.selection.main;
			const selStart = mainRange.from;
			const selEnd = mainRange.to;
			postMessage('onSelectionChange', { selection: { start: selStart, end: selEnd } });
		}
	}

	function notifySelectionFormattingChange(viewUpdate: ViewUpdate) {
		if (viewUpdate.docChanged || !viewUpdate.state.selection.eq(viewUpdate.startState.selection)) {
			const oldFormatting = computeSelectionFormatting(viewUpdate.startState);
			const newFormatting = computeSelectionFormatting(viewUpdate.state);

			if (!oldFormatting.eq(newFormatting)) {
				postMessage('onSelectionFormattingChange', newFormatting.toJSON());
			}
		}
	}

	function notifyLinkEditRequest() {
		postMessage('onRequestLinkEdit', null);
	}

	function computeSelectionFormatting(state: EditorState) {
		const range = state.selection.main;
		const formatting: SelectionFormatting = new SelectionFormatting();
		formatting.selectedText = state.doc.sliceString(range.from, range.to);

		const parseLinkData = (nodeText: string) => {
			const linkMatch = nodeText.match(/\[([^\]]*)\]\(([^)]*)\)/);
			return {
				linkText: linkMatch[1],
				linkURL: linkMatch[2],
			};
		};

		// Find the smallest range.
		syntaxTree(state).iterate({
			from: range.from, to: range.to,
			enter: node => {
				// Only handle notes that contain the entire range.
				if (node.from > range.from || node.to < range.to) {
					return;
				}
				// Lazily compute the node's text
				const nodeText = () => state.doc.sliceString(node.from, node.to);

				switch (node.name) {
				case 'StrongEmphasis':
					formatting.bolded = true;
					break;
				case 'Emphasis':
					formatting.italicized = true;
					break;
				case 'ListItem':
					formatting.listLevel += 1;
					break;
				case 'BulletList':
					formatting.inUnorderedList = true;
					break;
				case 'OrderedList':
					formatting.inOrderedList = true;
					break;
				case 'TaskList':
					formatting.inChecklist = true;
					break;
				case 'InlineCode':
				case 'FencedCode':
					formatting.inCode = true;
					break;
				case 'InlineMath':
				case 'BlockMath':
					formatting.inMath = true;
					break;
				case 'ATXHeading1':
					formatting.headerLevel = 1;
					break;
				case 'ATXHeading2':
					formatting.headerLevel = 2;
					break;
				case 'ATXHeading3':
					formatting.headerLevel = 3;
					break;
				case 'ATXHeading4':
					formatting.headerLevel = 4;
					break;
				case 'URL':
					formatting.inLink = true;
					formatting.linkData.linkURL = nodeText();
					break;
				case 'Link':
					formatting.inLink = true;
					formatting.linkData = parseLinkData(nodeText());
					break;
				}
			},
		});

		return formatting;
	}

	const selectionCommands = {
		// Expands selections to the smallest container node
		// with name [nodeName].
		// Returns a new selection.
		growSelectionToNode(sel: SelectionRange, nodeName: string): SelectionRange {
			let newFrom = null;
			let newTo = null;
			let smallestLen = Infinity;

			// Find the smallest range.
			syntaxTree(editor.state).iterate({
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
		},

		// Adds/removes [spec.templateStart] before the current selection and
		// [spec.templateStop] after it.
		// For example, surroundSelecton('**', '**') surrounds every selection
		// range with asterisks (including the caret).
		// If the selection is already surrounded by these characters, they are
		// removed.
		toggleRegionSurrounded(doc: DocumentText, sel: SelectionRange, spec: RegionSpec): SelectionUpdate {
			let content = doc.sliceString(sel.from, sel.to);
			const startMatchLen = spec.matchStart(editor.state.doc, sel);
			const endMatchLen = spec.matchStop(editor.state.doc, sel);

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
		},

		// Toggles whether the current selection/caret location is
		// associated with [nodeName], if [start] defines the start of
		// the region and [end], the end.
		toggleGlobalSelectionFormat(nodeName: string, spec: RegionSpec) {
			const changes = editor.state.changeByRange((sel: SelectionRange) => {
				return selectionCommands.toggleSelectionFormat(nodeName, sel, spec);
			});
			editor.dispatch(changes);
		},

		toggleSelectionFormat(nodeName: string, sel: SelectionRange, spec: RegionSpec): SelectionUpdate {
			const endMatchLen = spec.matchStop(editor.state.doc, sel);

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
			const newRange = selectionCommands.growSelectionToNode(sel, nodeName);
			return selectionCommands.toggleRegionSurrounded(editor.state.doc, newRange, spec);
		},

		// Toggle formatting in a region, applying a block version of the formatting
		// if multiple lines are selected.
		toggleRegionFormat(
			inlineNodeName: string, inlineSpec: RegionSpec,

			// The block version of the tag (e.g. fenced code)
			blockNodeName: string,
			blockRegex: { start: RegExp; stop: RegExp },

			// start: Single-line content that precedes the block
			// stop: Single-line content that follows the block.
			// line breaks will be added
			blockTemplate: { start: string; stop: string }
		) {
			const doc = editor.state.doc;

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

			const changes = editor.state.changeByRange((sel: SelectionRange) => {

				// If we're in the block version, grow the selection to cover the entire region.
				sel = selectionCommands.growSelectionToNode(sel, blockNodeName);

				const fromLine = doc.lineAt(sel.from);
				const toLine = doc.lineAt(sel.to);
				let charsAdded = 0;
				const changes = [];

				// Single line: Inline toggle.
				if (fromLine.number == toLine.number) {
					return selectionCommands.toggleSelectionFormat(inlineNodeName, sel, inlineSpec);
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
			editor.dispatch(changes);
		},

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
		toggleSelectedLinesStartWith(
			regex: RegExp,
			template: string | ((line: Line, firstLine: Line, lastLine: Line)=> string),
			matchEmpty: boolean, nodeName?: string
		): boolean {
			let didDeletion = false;

			const changes = editor.state.changeByRange((sel: SelectionRange) => {
				// Attempt to select all lines in the region
				if (nodeName && sel.empty) {
					sel = selectionCommands.growSelectionToNode(sel, nodeName);
				}

				const doc = editor.state.doc;
				const fromLine = doc.lineAt(sel.from);
				const toLine = doc.lineAt(sel.to);
				let hasProp = false;
				let charsAdded = 0;

				const changes = [];
				const lines = [];

				for (let i = fromLine.number; i <= toLine.number; i++) {
					const line = doc.line(i);

					// If already matching [regex],
					if (line.text.search(regex) == 0) {
						hasProp = true;
					}

					lines.push(line);
				}

				for (const line of lines) {
					// Only process if the line is non-empty.
					if (!matchEmpty && line.text.trim().length == 0
							// Treat the first line differently
							&& fromLine.number < line.number) {
						continue;
					}

					if (hasProp) {
						const match = line.text.match(regex);
						if (!match) {
							continue;
						}

						changes.push({
							from: line.from,
							to: line.from + match[0].length,
						});

						charsAdded -= match[0].length;
						didDeletion = true;
					} else {
						let templateVal;
						if (typeof template == 'string') {
							templateVal = template;
						} else {
							templateVal = template(line, fromLine, toLine);
						}

						changes.push({
							from: line.from,
							insert: templateVal,
						});

						charsAdded += templateVal.length;
					}
				}

				return {
					changes,

					// Selection should now encompass all lines that were changed.
					range: EditorSelection.range(fromLine.from, toLine.to + charsAdded),
				};
			});
			editor.dispatch(changes);

			return didDeletion;
		},

		// Bolds/unbolds the current selection.
		bold() {
			logMessage('Toggling bolded!');

			selectionCommands.toggleGlobalSelectionFormat('StrongEmphasis', new RegionSpec({
				templateStart: '**',
				templateStop: '**',
			}));
		},

		// Italicizes/deitalicizes the current selection.
		italicize() {
			logMessage('Toggling italicized!');

			selectionCommands.toggleGlobalSelectionFormat('Emphasis', new RegionSpec({
				// Template start/end
				templateStart: '*',
				templateStop: '*',

				// Regular expressions that match all possible start/ends
				startExp: /[_*]/g,
				stopExp: /[_*]/g,
			}));
		},

		toggleCode() {
			logMessage('Toggling code!');

			const codeFenceRegex = /^```\w*\s*$/;
			const inlineRegionSpec = new RegionSpec({
				templateStart: '`',
				templateStop: '`',
			});

			selectionCommands.toggleRegionFormat(
				'InlineCode', inlineRegionSpec,

				'FencedCode', { start: codeFenceRegex, stop: codeFenceRegex },
				{ start: '```', stop: '```' }
			);
		},

		toggleMath() {
			logMessage('Toggling math!');

			const blockStartRegex = /^\$\$/;
			const blockStopRegex = /\$\$\s*$/;
			const inlineRegionSpec = new RegionSpec({
				templateStart: '$',
				templateStop: '$',
			});

			selectionCommands.toggleRegionFormat(
				'InlineMath', inlineRegionSpec,

				'BlockMath', { start: blockStartRegex, stop: blockStopRegex },
				{ start: '$$', stop: '$$' }
			);
		},

		toggleList(bulleted: boolean) {
			logMessage('Toggling bulleted list!');

			// Include `(?:\[[ xX]+\]...)?` to also match checklists.
			const bulletedRegex = /^\s*[-*]\s(?:\[[ xX]+\]\s?)?/;
			const numberedRegex = /^\s*\d+\.\s?/;
			const otherListTypeRegex = bulleted ? numberedRegex : bulletedRegex;
			const thisListTypeRegex = bulleted ? bulletedRegex : numberedRegex;


			const matchEmpty = false;
			// Remove formatting from a different type of list
			selectionCommands.toggleSelectedLinesStartWith(
				otherListTypeRegex,
				'',
				matchEmpty,
				bulleted ? 'OrderedList' : 'BulletList'
			);

			let lineIdx = 0;
			selectionCommands.toggleSelectedLinesStartWith(
				thisListTypeRegex,
				() => {
					if (bulleted) {
						return ' - ';
					}

					lineIdx ++;
					return ` ${lineIdx}. `;
				},
				matchEmpty,
				bulleted ? 'BulletList' : 'OrderedList'
			);
		},

		toggleHeaderLevel(level: number) {
			logMessage(`Setting heading level to ${level}`);

			let headerStr = '';
			for (let i = 0; i < level; i++) {
				headerStr += '#';
			}

			const matchEmpty = true;
			// Remove header formatting for any other level
			selectionCommands.toggleSelectedLinesStartWith(
				new RegExp(
					// Check all numbers of #s lower than [level]
					`${level - 1 >= 1 ? `(?:^[#]{1,${level - 1}}\\s)|` : ''

					// Check all number of #s higher than [level]
					}(?:^[#]{${level + 1},}\\s)`
				),
				'',
				matchEmpty
			);

			// Set to the proper header level
			selectionCommands.toggleSelectedLinesStartWith(
				// We want exactly [level] '#' characters.
				new RegExp(`^[#]{${level}} `),
				`${headerStr} `,
				matchEmpty
			);
		},

		increaseIndent() {
			logMessage('Increasing indentation.');
			const matchEmpty = true;
			const matchNothing = /$ ^/;

			selectionCommands.toggleSelectedLinesStartWith(
				// Add a tab to the beginning of all lines
				matchNothing,
				// Always indent with a tab
				'\t',
				matchEmpty
			);
		},

		decreaseIndent() {
			logMessage('Decreasing indentation.');
			const matchEmpty = true;
			selectionCommands.toggleSelectedLinesStartWith(
				// Assume indentation is either a tab or in units
				// of four spaces.
				/^(?:[\t]|[ ]{1,4})/,
				// Don't add new text
				'',
				matchEmpty
			);
		},

		// Create a new link with [label] and [url], or, if a link is either partially
		// or fully selected, update the label and URL of that link.
		updateLink(label: string, url: string) {
			const linkText = `[${label}](${url})`;

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
		},
	};

	// Returns a keyboard command that returns true (so accepts the keybind)
	const keyCommand = (key: string, run: ()=> void): KeyBinding => {
		return {
			key,
			run: (_: EditorView): boolean => {
				run();
				return true;
			},
			preventDefault: true,
		};
	};

	const editor = new EditorView({
		state: EditorState.create({
			// See https://github.com/codemirror/basic-setup/blob/main/src/codemirror.ts
			// for a sample configuration.
			extensions: [
				markdown({
					extensions: [
						GFM, MarkdownTeXParser,
					],
				}),
				...createTheme(theme),
				history(),
				search(),
				drawSelection(),
				highlightSpecialChars(),
				highlightSelectionMatches(),
				indentOnInput(),

				EditorView.lineWrapping,
				EditorView.contentAttributes.of({ autocapitalize: 'sentence' }),
				EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
					notifyDocChanged(viewUpdate);
					notifySelectionChange(viewUpdate);
					notifySelectionFormattingChange(viewUpdate);
				}),
				keymap.of([
					...defaultKeymap, ...historyKeymap, ...searchKeymap,

					// Markdown formatting keyboard shortcuts
					keyCommand('Mod-b', selectionCommands.bold),
					keyCommand('Mod-i', selectionCommands.italicize),
					keyCommand('Mod-$', selectionCommands.toggleMath),
					keyCommand('Mod-`', selectionCommands.toggleCode),
					keyCommand('Mod-k', notifyLinkEditRequest),
				]),
			],
			doc: initialText,
		}),
		parent: parentElement,
	});

	const editorControls = {
		editor,
		undo() {
			undo(editor);
			schedulePostUndoRedoDepthChange(editor, true);
		},
		redo() {
			redo(editor);
			schedulePostUndoRedoDepthChange(editor, true);
		},
		select(anchor: number, head: number) {
			editor.dispatch(editor.state.update({
				selection: { anchor, head },
				scrollIntoView: true,
			}));
		},
		scrollSelectionIntoView() {
			editor.dispatch(editor.state.update({
				scrollIntoView: true,
			}));
		},
		insertText(text: string) {
			editor.dispatch(editor.state.replaceSelection(text));
		},

		// Formatting commands
		selectionCommands,
	};

	return editorControls;
}

