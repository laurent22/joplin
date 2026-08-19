import { HighlightedWord } from '@joplin/lib/reducer';
import SearchEngine from '@joplin/lib/services/search/SearchEngine';
import { themeStyle } from '@joplin/lib/theme';
import { Theme } from '@joplin/lib/themes/type';
import { useEffect, useMemo } from 'react';
import { Editor, EditorEvent } from 'tinymce';

declare global {
	interface Window {
		Highlight: typeof Highlight;
		Range: typeof Range;
		CSS: typeof CSS;
	}
}

const useSearchRegexes = (searchTerms: HighlightedWord[]) => {
	return useMemo(() => {
		return searchTerms.map((term: HighlightedWord) => {
			let text;
			if (typeof term === 'string') {
				text = term;
			} else {
				text = term.value;
			}
			return new RegExp(SearchEngine.instance().queryTermToRegex(text), 'ig');
		});
	}, [searchTerms]);
};

const useHighlightStyleSheet = (editor: Editor, themeId: number) => {
	useEffect(() => {
		if (!editor) {
			return () => {};
		}

		const theme: Theme = themeStyle(themeId);
		const style = editor.dom.create('style', {}, `
			/* Avoid showing highlights when the user has the find dialog open and
			   there are TinyMCE-provided search results */
			body:not(:has(span.mce-match-marker)) {
				::highlight(jop-search-highlight) {
					background-color: ${theme.searchMarkerBackgroundColor};
					color: ${theme.searchMarkerColor};
				}
			}
		`);
		editor.getDoc().head.appendChild(style);

		return () => {
			style.remove();
		};
	}, [editor, themeId]);
};

const useHighlighter = (editor: Editor, searchRegexes: RegExp[]) => {
	return useMemo(() => {
		if (!editor) {
			return { canHighlight: false };
		}

		const editorWindow = editor.getWin();
		const ranges: Map<Node, Range[]> = new Map();
		let highlight: Highlight = undefined;

		const processNode = (node: Node) => {
			ranges.delete(node);

			type FoundChildAndOffset = { node: Node; offset: number };
			const findChildAtTextOffset = (parent: Node, offset: number): FoundChildAndOffset => {
				if (offset > parent.textContent.length) return null;
				if (parent.nodeName === '#text') {
					return { node: parent, offset };
				}

				let start = 0;
				for (const child of parent.childNodes) {
					if (child.nodeName === '#comment') continue;

					const found = findChildAtTextOffset(child, offset - start);
					start += child.textContent.length;
					if (found) return found;
				}
				return null;
			};

			const buildRange = (parent: Node, startIndex: number, endIndex: number) => {
				const range: Range = new editorWindow.Range();
				const start = findChildAtTextOffset(parent, startIndex);
				const end = findChildAtTextOffset(parent, endIndex);
				range.setStart(start?.node ?? parent, start?.offset ?? 0);
				range.setEnd(end?.node ?? parent, end?.offset ?? parent.textContent.length);
				return range;
			};

			// Process highlights at the paragraph level, where possible, to pick up formatting that crosses Markdown boundaries
			const isLeaf = node.nodeName === '#text' || node.nodeName === 'P';
			if (isLeaf) {
				const childRanges = [];
				for (const term of searchRegexes) {
					const matches = node.textContent.matchAll(term);

					for (const match of matches) {
						const startIndex = match.index ?? 0;
						const endIndex = (match.index ?? 0) + match[0].length;
						childRanges.push(buildRange(node, startIndex, endIndex));
					}
				}

				if (childRanges.length > 0) {
					ranges.set(node, childRanges);
				}
			} else {
				for (const child of node.childNodes) {
					processNode(child);
				}
			}
		};

		const closestParagraph = (node: Node) => node.parentElement?.closest('p');

		const onNodeChanged = (node: Node) => {
			highlight?.clear();

			processNode(closestParagraph(node) ?? node);

			highlight = new editorWindow.Highlight(...[...ranges.values()].flat());
			editorWindow.CSS.highlights.set('jop-search-highlight', highlight);
		};

		const onNodeRemoved = (node: Node, parent: Node) => {
			ranges.delete(node);

			// Handle the case where removing a node created a match:
			const parentParagraph = closestParagraph(parent);
			if (parentParagraph) {
				onNodeChanged(parentParagraph);
			}
		};

		const clearHighlights = () => {
			highlight?.clear();
			editorWindow.CSS.highlights.delete('jop-search-highlight');
			ranges.clear();
		};

		return { onNodeChanged, onNodeRemoved, clearHighlights, canHighlight: searchRegexes.length > 0 };
	}, [editor, searchRegexes]);
};

const useHighlightedSearchTerms = (editor: Editor, searchTerms: HighlightedWord[], themeId: number) => {
	const searchRegexes = useSearchRegexes(searchTerms);
	useHighlightStyleSheet(editor, themeId);
	const highlighter = useHighlighter(editor, searchRegexes);

	useEffect(() => {
		if (!editor || !highlighter.canHighlight) {
			return () => {};
		}

		const editorBody = editor.getBody();

		type NodeChangeEvent = { element: Element };
		const onNodeChange = ({ element }: EditorEvent<NodeChangeEvent>) => {
			highlighter.onNodeChanged(element);
		};

		const onKeyUp = (_event: KeyboardEvent) => {
			// Use selectedNode and not event.target -- event.target seems to always point
			// to the body.
			const selectedNode = editor.selection.getNode();
			if (selectedNode) {
				highlighter.onNodeChanged(selectedNode);
			}
		};

		const onSetContent = () => {
			highlighter.onNodeChanged(editorBody);
		};

		editor.on('NodeChange', onNodeChange);
		editor.on('SetContent', onSetContent);

		// NodeChange doesn't fire while typing, so we also need keyup
		editor.on('keyup', onKeyUp);

		// NodeChange also doesn't fire for certain DOM changes (e.g. when TinyMCE-provided search highlights are added/removed):
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.removedNodes) {
					highlighter.onNodeRemoved(node, mutation.target);
				}

				for (const node of mutation.addedNodes) {
					highlighter.onNodeChanged(node);
				}
			}
		});
		observer.observe(editorBody, { subtree: true, childList: true });

		onSetContent();

		return () => {
			observer.disconnect();
			highlighter.clearHighlights();

			editor.off('NodeChange', onNodeChange);
			editor.off('keyup', onKeyUp);
			editor.off('SetContent', onSetContent);
		};
	}, [editor, highlighter]);
};

export default useHighlightedSearchTerms;
