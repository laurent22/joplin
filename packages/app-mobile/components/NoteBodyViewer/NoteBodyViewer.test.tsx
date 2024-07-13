import * as React from 'react';

import { describe, it, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';


import NoteBodyViewer from './NoteBodyViewer';
import Setting from '@joplin/lib/models/Setting';
import { MenuProvider } from 'react-native-popup-menu';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { MarkupLanguage } from '@joplin/renderer';

interface WrapperProps {
	noteBody: string;
	highlightedKeywords?: string[];
	noteResources?: unknown;
	onJoplinLinkClick?: (message: string)=> void;
	onScroll?: (percent: number)=> void;
}

const emptyObject = {};
const emptyArray: string[] = [];
const noOpFunction = () => {};
const WrappedNoteViewer: React.FC<WrapperProps> = (
	{
		noteBody,
		highlightedKeywords = emptyArray,
		noteResources = emptyObject,
		onJoplinLinkClick = noOpFunction,
		onScroll = noOpFunction,
	}: WrapperProps,
) => {
	return <MenuProvider>
		<NoteBodyViewer
			themeId={Setting.THEME_LIGHT}
			style={emptyObject}
			noteBody={noteBody}
			noteMarkupLanguage={MarkupLanguage.Markdown}
			highlightedKeywords={highlightedKeywords}
			noteResources={noteResources}
			paddingBottom={0}
			initialScroll={0}
			noteHash={''}
			onJoplinLinkClick={onJoplinLinkClick}
			onScroll={onScroll}
			pluginStates={emptyObject}
		/>
	</MenuProvider>;
};

const getNoteViewerDom = async (): Promise<Document> => {
	const webviewContent = await screen.findByTestId('NoteBodyViewer');
	expect(webviewContent).toBeVisible();

	await waitFor(() => {
		expect(!!webviewContent.props.document).toBe(true);
	});

	// Return the composite ExtendedWebView component
	// See https://callstack.github.io/react-native-testing-library/docs/advanced/testing-env#tree-navigation
	return webviewContent.props.document;
};

describe('NoteBodyViewer', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
	});

	afterEach(() => {
		screen.unmount();
	});

	it('should render markdown, and re-render on change', async () => {
		const wrappedViewer = render(<WrappedNoteViewer noteBody='# Test'/>);

		const expectHeaderToBe = async (text: string) => {
			const noteViewer = await getNoteViewerDom();
			await waitFor(async () => {
				console.log((await getNoteViewerDom()).body.querySelector('#rendered-md').innerHTML);
				expect(noteViewer.querySelector('h1').textContent).toBe(text);
			});
		};

		await expectHeaderToBe('Test');
		wrappedViewer.rerender(<WrappedNoteViewer noteBody='# Test 2'/>);
		await expectHeaderToBe('Test 2');
		wrappedViewer.rerender(<WrappedNoteViewer noteBody='# Test 3'/>);
		await expectHeaderToBe('Test 3');
		wrappedViewer.unmount();
	});

	it.each([
		{ keywords: ['match'], body: 'A match and another match. Both should be highlighted.', expectedMatchCount: 2 },	
		{ keywords: ['test'], body: 'No match.', expectedMatchCount: 0 },	
		{ keywords: ['a', 'b'], body: 'a, a, a, b, b, b', expectedMatchCount: 6 },	
	])('should highlight search terms (case %#)', async ({ keywords, body, expectedMatchCount }) => {
		const noteViewer = render(
			<WrappedNoteViewer
				highlightedKeywords={keywords}
				noteBody={body}
			/>,
		);

		let noteViewerDom = await getNoteViewerDom();
		await waitFor(() => {
			expect(noteViewerDom.querySelectorAll('.highlighted-keyword')).toHaveLength(expectedMatchCount);
		});

		// Should update highlights when the keywords change
		noteViewer.rerender(
			<WrappedNoteViewer
				highlightedKeywords={[]}
				noteBody={body}
			/>,
		);
		noteViewerDom = await getNoteViewerDom();
		await waitFor(() => {
			expect(noteViewerDom.querySelectorAll('.highlighted-keyword')).toHaveLength(0);
		});

		noteViewer.unmount();
	});
});
