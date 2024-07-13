
import * as React from 'react';

import { describe, it, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';


import NoteBodyViewer from './NoteBodyViewer';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';
import { MenuProvider } from 'react-native-popup-menu';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import { MarkupLanguage } from '@joplin/renderer';

interface WrapperProps {
	noteBody: string;
	highlightedKeywords?: string[];
	noteResources?: unknown;
	onJoplinLinkClick?: (message: string)=>void;
	onScroll?: (percent: number)=>void;
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
	}: WrapperProps
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

const getNoteViewerDom = async () => {
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
		// Required to use ExtendedWebView
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
	});

	it('should render markdown', async () => {
		const wrappedViewer = render(<WrappedNoteViewer noteBody='# Test'/>);

		const noteViewer = await getNoteViewerDom();
		await waitFor(() => {
			expect(noteViewer.querySelector('h1').textContent).toBe('Test');
		});

		wrappedViewer.unmount();
	});
});