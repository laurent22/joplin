import * as React from 'react';

import { describe, it, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '../../utils/testing/testingLibrary';


import NoteBodyViewer from './NoteBodyViewer';
import Setting from '@joplin/lib/models/Setting';
import { resourceFetcher, setupDatabaseAndSynchronizer, supportDir, switchClient, synchronizerStart } from '@joplin/lib/testing/test-utils';
import { MarkupLanguage } from '@joplin/renderer';
import { OnMarkForDownloadCallback } from './hooks/useOnMessage';
import Resource from '@joplin/lib/models/Resource';
import shim from '@joplin/lib/shim';
import Note from '@joplin/lib/models/Note';
import { ResourceInfo } from './hooks/useRerenderHandler';
import getWebViewDomById from '../../utils/testing/getWebViewDomById';
import TestProviderStack from '../testing/TestProviderStack';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import Plugin from '@joplin/lib/services/plugins/Plugin';
import { Store } from 'redux';
import { ContentScriptType } from '@joplin/lib/services/plugins/api/types';
import { basename, dirname, join } from 'path';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import mockPluginServiceSetup from '../../utils/testing/mockPluginServiceSetup';

interface WrapperProps {
	noteBody: string;
	highlightedKeywords?: string[];
	noteResources?: Record<string, ResourceInfo>;
	onScroll?: ()=> void;
	onMarkForDownload?: OnMarkForDownloadCallback;
}

const emptyObject = {};
const emptyArray: string[] = [];
const noOpFunction = () => {};
let testStore: Store;
const WrappedNoteViewer: React.FC<WrapperProps> = (
	{
		noteBody,
		highlightedKeywords = emptyArray,
		noteResources = emptyObject,
		onScroll = noOpFunction,
		onMarkForDownload,
	}: WrapperProps,
) => {
	return <TestProviderStack store={testStore}>
		<NoteBodyViewer
			style={emptyObject}
			noteBody={noteBody}
			noteMarkupLanguage={MarkupLanguage.Markdown}
			highlightedKeywords={highlightedKeywords}
			noteResources={noteResources}
			paddingBottom={0}
			initialScrollPercent={0}
			noteHash={''}
			onMarkForDownload={onMarkForDownload}
			onScroll={onScroll}
		/>
	</TestProviderStack>;
};

const getNoteViewerDom = async () => {
	return await getWebViewDomById('NoteBodyViewer');
};

const loadTestContentScript = async (path: string, pluginId: string) => {
	const plugin = new Plugin(
		dirname(path),
		{
			manifest_version: 1,
			id: pluginId,
			name: 'Test plugin',
			version: '1',
			app_min_version: '1',
		},
		'',
		testStore.dispatch,
		'',
	);
	await PluginService.instance().runPlugin(plugin);
	await plugin.registerContentScript(
		ContentScriptType.MarkdownItPlugin,
		`${pluginId}-markdown-it`,
		basename(path),
	);
};

describe('NoteBodyViewer', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
		testStore = createMockReduxStore();
		mockPluginServiceSetup(testStore);
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

	it('should support basic renderer plugins', async () => {
		await loadTestContentScript(join(supportDir, 'plugins', 'markdownItTestPlugin.js'), 'test-plugin');

		render(<WrappedNoteViewer noteBody={'```justtesting\ntest\n```\n'}/>);

		const noteViewer = await getNoteViewerDom();
		await waitFor(async () => {
			expect(noteViewer.querySelector('div.just-testing')).toBeTruthy();
		});
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
