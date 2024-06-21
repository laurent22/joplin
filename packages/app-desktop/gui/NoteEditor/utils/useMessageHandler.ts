import { useCallback } from 'react';
import { FormNote, HtmlToMarkdownHandler, MarkupToHtmlHandler, ScrollOptions } from './types';
import contextMenu from './contextMenu';
import CommandService from '@joplin/lib/services/CommandService';
import PostMessageService from '@joplin/lib/services/PostMessageService';
import ResourceFetcher from '@joplin/lib/services/ResourceFetcher';
import { reg } from '@joplin/lib/registry';
const bridge = require('@electron/remote').require('./bridge').default;

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
export default function useMessageHandler(scrollWhenReady: ScrollOptions|null, clearScrollWhenReady: ()=> void, editorRef: any, setLocalSearchResultCount: Function, dispatch: Function, formNote: FormNote, htmlToMd: HtmlToMarkdownHandler, mdToHtml: MarkupToHtmlHandler) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	return useCallback(async (event: any) => {
		const msg = event.channel ? event.channel : '';
		const args = event.args;
		const arg0 = args && args.length >= 1 ? args[0] : null;

		// eslint-disable-next-line no-console
		if (msg !== 'percentScroll') console.info(`Got ipc-message: ${msg}`, arg0);

		if (msg.indexOf('error:') === 0) {
			const s = msg.split(':');
			s.splice(0, 1);
			reg.logger().error(s.join(':'));
		} else if (msg === 'noteRenderComplete') {
			if (scrollWhenReady) {
				const options = { ...scrollWhenReady };
				clearScrollWhenReady();
				editorRef.current.scrollTo(options);
			}
		} else if (msg === 'setMarkerCount') {
			setLocalSearchResultCount(arg0);
		} else if (msg.indexOf('markForDownload:') === 0) {
			const s = msg.split(':');
			if (s.length < 2) throw new Error(`Invalid message: ${msg}`);
			void ResourceFetcher.instance().markForDownload(s[1]);
		} else if (msg === 'contextMenu') {
			const menu = await contextMenu({
				itemType: arg0 && arg0.type,
				resourceId: arg0.resourceId,
				filename: arg0.filename,
				mime: arg0.mime,
				textToCopy: arg0.textToCopy,
				linkToCopy: arg0.linkToCopy || null,
				htmlToCopy: '',
				insertContent: () => { console.warn('insertContent() not implemented'); },
				fireEditorEvent: () => { console.warn('fireEditorEvent() not implemented'); },
				htmlToMd,
				mdToHtml,
			}, dispatch);

			menu.popup({ window: bridge().window() });
		} else if (msg.indexOf('#') === 0) {
			// This is an internal anchor, which is handled by the WebView so skip this case
		} else if (msg === 'contentScriptExecuteCommand') {
			const commandName = arg0.name;
			const commandArgs = arg0.args || [];
			void CommandService.instance().execute(commandName, ...commandArgs);
		} else if (msg === 'postMessageService.message') {
			void PostMessageService.instance().postMessage(arg0);
		} else if (msg === 'openPdfViewer') {
			await CommandService.instance().execute('openPdfViewer', arg0.resourceId, arg0.pageNo);
		} else {
			await CommandService.instance().execute('openItem', msg);
			// bridge().showErrorMessageBox(_('Unsupported link or message: %s', msg));
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [dispatch, setLocalSearchResultCount, scrollWhenReady, formNote]);
}
