import { RefObject, useEffect } from 'react';
import usePrevious from '../../../../hooks/usePrevious';
import { RenderedBody } from './types';
const debounce = require('debounce');

interface Props {
	setLocalSearchResultCount(count: number): void;
	searchMarkers: any;
	webviewRef: RefObject<any>;
	editorRef: RefObject<any>;

	noteContent: string;
	renderedBody: RenderedBody;
}

const useEditorSearchHandler = (props: Props) => {
	const { webviewRef, editorRef, renderedBody, noteContent, searchMarkers } = props;

	const previousContent = usePrevious(noteContent);
	const previousRenderedBody = usePrevious(renderedBody);
	const previousSearchMarkers = usePrevious(searchMarkers);

	useEffect(() => {
		if (!searchMarkers) return () => {};

		// If there is a currently active search, it's important to re-search the text as the user
		// types. However this is slow for performance so we ONLY want it to happen when there is
		// a search

		// Note that since the CodeMirror component also needs to handle the viewer pane, we need
		// to check if the rendered body has changed too (it will be changed with a delay after
		// props.content has been updated).
		const textChanged = searchMarkers.keywords.length > 0 && (noteContent !== previousContent || renderedBody !== previousRenderedBody);

		if (webviewRef.current && (searchMarkers !== previousSearchMarkers || textChanged)) {
			webviewRef.current.send('setMarkers', searchMarkers.keywords, searchMarkers.options);

			if (editorRef.current) {
				// Fixes https://github.com/laurent22/joplin/issues/7565
				const debouncedMarkers = debounce(() => {
					const matches = editorRef.current.setMarkers(searchMarkers.keywords, searchMarkers.options);

					props.setLocalSearchResultCount(matches);
				}, 50);
				debouncedMarkers();
				return () => {
					debouncedMarkers.clear();
				};
			}
		}
		return () => {};
	}, [
		editorRef,
		webviewRef,
		searchMarkers,
		previousSearchMarkers,
		props.setLocalSearchResultCount,
		noteContent,
		previousContent,
		previousRenderedBody,
		renderedBody,
	]);

};

export default useEditorSearchHandler;
