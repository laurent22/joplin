import * as React from 'react';

import { describe, it, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';


import NoteBodyViewer from './NoteBodyViewer';
import Setting from '@joplin/lib/models/Setting';
import { MenuProvider } from 'react-native-popup-menu';
import { resourceFetcher, setupDatabaseAndSynchronizer, supportDir, switchClient, synchronizerStart } from '@joplin/lib/testing/test-utils';
import { MarkupLanguage } from '@joplin/renderer';
import { HandleMessageCallback, OnMarkForDownloadCallback } from './hooks/useOnMessage';
import Resource from '@joplin/lib/models/Resource';
import shim from '@joplin/lib/shim';
import Note from '@joplin/lib/models/Note';
import { ResourceInfo } from './hooks/useRerenderHandler';
import getWebViewDomById from '../../utils/testing/getWebViewDomById';

interface WrapperProps {
	noteBody: string;
	highlightedKeywords?: string[];
	noteResources?: Record<string, ResourceInfo>;
	onJoplinLinkClick?: HandleMessageCallback;
	onScroll?: (percent: number)=> void;
	onMarkForDownload?: OnMarkForDownloadCallback;
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
		onMarkForDownload,
	}: WrapperProps,
) => {
	return <MenuProvider>
		<NoteBodyViewer
			themeId={Setting.THEME_LIGHT}
			style={emptyObject}
			fontSize={12}
			noteBody={noteBody}
			noteMarkupLanguage={MarkupLanguage.Markdown}
			highlightedKeywords={highlightedKeywords}
			noteResources={noteResources}
			paddingBottom={0}
			initialScroll={0}
			noteHash={''}
			onJoplinLinkClick={onJoplinLinkClick}
			onMarkForDownload={onMarkForDownload}
			onScroll={onScroll}
			pluginStates={emptyObject}
		/>
	</MenuProvider>;
};

const getNoteViewerDom = async () => {
	return await getWebViewDomById('NoteBodyViewer');
};

describe('NoteBodyViewer', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
	});

	afterEach(() => {
		screen.unmount();
	});

	it('should render markdown and re-render on change', async () => {
		render(<WrappedNoteViewer noteBody='# Test'/>);

		const expectHeaderToBe = async (text: string) => {
			const noteViewer = await getNoteViewerDom();
			await waitFor(async () => {
				expect(noteViewer.querySelector('h1').textContent).toBe(text);
			});
		};

		await expectHeaderToBe('Test');
		screen.rerender(<WrappedNoteViewer noteBody='# Test 2'/>);
		await expectHeaderToBe('Test 2');
		screen.rerender(<WrappedNoteViewer noteBody='# Test 3'/>);
		await expectHeaderToBe('Test 3');
	});

	it.each([
		{ keywords: ['match'], body: 'A match and another match. Both should be highlighted.', expectedMatchCount: 2 },
		{ keywords: ['test'], body: 'No match.', expectedMatchCount: 0 },
		{ keywords: ['a', 'b'], body: 'a, a, a, b, b, b', expectedMatchCount: 6 },
	])('should highlight search terms (case %#)', async ({ keywords, body, expectedMatchCount }) => {
		render(
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
		screen.rerender(
			<WrappedNoteViewer
				highlightedKeywords={[]}
				noteBody={body}
			/>,
		);
		noteViewerDom = await getNoteViewerDom();
		await waitFor(() => {
			expect(noteViewerDom.querySelectorAll('.highlighted-keyword')).toHaveLength(0);
		});
	});

	it('tapping on resource download icons should mark the resources for download', async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		let note1 = await Note.save({ title: 'Note 1', parent_id: '' });
		note1 = await shim.attachFileToNote(note1, `${supportDir}/photo.jpg`);

		await synchronizerStart();
		await switchClient(0);
		Setting.setValue('sync.resourceDownloadMode', 'manual');
		await synchronizerStart();

		const allResources = await Resource.all();
		expect(allResources.length).toBe(1);
		const localResource = allResources[0];
		const localState = await Resource.localState(localResource);
		expect(localState.fetch_status).toBe(Resource.FETCH_STATUS_IDLE);

		const onMarkForDownload: OnMarkForDownloadCallback = jest.fn(({ resourceId }) => {
			return resourceFetcher().markForDownload([resourceId]);
		});
		render(
			<WrappedNoteViewer
				noteBody={note1.body}
				noteResources={{ [localResource.id]: { localState, item: localResource } }}
				onMarkForDownload={onMarkForDownload}
			/>,
		);

		// The resource placeholder should have rendered
		const noteViewerDom = await getNoteViewerDom();
		let resourcePlaceholder: HTMLElement|null = null;
		await waitFor(() => {
			const placeholders = noteViewerDom.querySelectorAll<HTMLElement>(`[data-resource-id=${JSON.stringify(localResource.id)}]`);
			expect(placeholders).toHaveLength(1);
			resourcePlaceholder = placeholders[0];
		});

		expect([...resourcePlaceholder.classList]).toContain('resource-status-notDownloaded');

		// Clicking on the placeholder should download its resource
		await waitFor(() => {
			resourcePlaceholder.click();
			expect(onMarkForDownload).toHaveBeenCalled();
		});

		await resourceFetcher().waitForAllFinished();

		await waitFor(async () => {
			expect(await Resource.localState(localResource.id)).toMatchObject({ fetch_status: Resource.FETCH_STATUS_DONE });
		});
	});
});
