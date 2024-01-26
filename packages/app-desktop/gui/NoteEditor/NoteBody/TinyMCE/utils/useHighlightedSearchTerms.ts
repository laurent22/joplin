import SearchEngine from '@joplin/lib/services/search/SearchEngine';
import { themeStyle } from '@joplin/lib/theme';
import { Theme } from '@joplin/lib/themes/type';
import { useEffect, useMemo } from 'react';
import { Editor } from 'tinymce';

// TODO: Remove after upgrading TypeScript.
// NOTE: While Highlight is Set-like, its API may be slightly different.
declare global {
	interface Window {
		Highlight: any;
		Range: any;
		CSS: any;
	}
}

const useHighlightedSearchTerms = (editor: Editor, searchTerms: string[], themeId: number) => {
	const searchRegexes = useMemo(() => {
		return searchTerms.map(term => {
			if (typeof term === 'object') {
				term = (term as any).value;
			}
			return new RegExp(SearchEngine.instance().queryTermToRegex(term), 'ig');
		});
	}, [searchTerms]);

	useEffect(() => {
		if (!editor) {
			return () => {};
		}

		const theme: Theme = themeStyle(themeId);
		const style = editor.dom.create('style', {}, `
			::highlight(jop-search-highlight) {
				background-color: ${theme.searchMarkerBackgroundColor};
				color: ${theme.searchMarkerColor};
			}

			/* Try to work around a bug on chrome where misspellings also have the
			   same color as search markers. */
			::spelling-error, ::highlight(none) {
				color: inherit;
			}
		`);
		editor.getDoc().head.appendChild(style);

		return () => {
			style.remove();
		};
	}, [editor, themeId]);

	useEffect(() => {
		if (!editor) {
			return () => {};
		}

		const editorWindow = editor.getWin();
		const ranges: Map<Node, Range[]> = new Map();
		let highlight: any = undefined;

		const processNode = (node: Node) => {
			for (const child of node.childNodes) {
				if (child.nodeName === '#text') {
					for (const term of searchRegexes) {
						const matches = child.textContent.matchAll(term);
						const childRanges = [];

						for (const match of matches) {
							const range: Range = new editorWindow.Range();
							range.setStart(child, match.index ?? 0);
							range.setEnd(child, (match.index ?? 0) + match[0].length);
							childRanges.push(range);
						}

						ranges.set(child, childRanges);
					}
				} else {
					processNode(child);
				}
			}
		};

		const rebuildHighlights = (element: Node) => {
			highlight?.clear();

			processNode(element);

			highlight = new editorWindow.Highlight(...[...ranges.values()].flat());
			editorWindow.CSS.highlights.set('jop-search-highlight', highlight);
		};

		const onNodeChange = ({ element }: any) => {
			rebuildHighlights(element);
		};

		const onKeyUp = (_event: KeyboardEvent) => {
			// Use selectedNode and not event.target -- event.target seems to always point
			// to the body.
			const selectedNode = editor.selection.getNode();
			if (selectedNode) {
				rebuildHighlights(selectedNode);
			}
		};

		const onSetContent = () => {
			rebuildHighlights(editorWindow.document.body);
		};

		editor.on('NodeChange', onNodeChange);
		editor.on('SetContent', onSetContent);

		// NodeChange doesn't fire while typing, so we also need keyup
		editor.on('keyup', onKeyUp);

		rebuildHighlights(editorWindow.document.body);

		return () => {
			highlight?.clear();
			editorWindow.CSS.highlights.delete('jop-search-highlight');

			editor.off('NodeChange', onNodeChange);
			editor.off('keyup', onKeyUp);
			editor.off('SetContent', onSetContent);
		};
	}, [searchRegexes, editor]);
};

export default useHighlightedSearchTerms;
