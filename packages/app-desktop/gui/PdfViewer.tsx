import * as React from 'react';
import { useCallback, useRef, useEffect } from 'react';
import Resource from '@joplin/lib/models/Resource';
import bridge from '../services/bridge';
import contextMenu from './NoteEditor/utils/contextMenu';
import { ContextMenuItemType, ContextMenuOptions } from './NoteEditor/utils/contextMenuUtils';
import CommandService from '@joplin/lib/services/CommandService';
import styled from 'styled-components';
import { themeStyle } from '@joplin/lib/theme';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied;
type StyleProps = any;

const Window = styled.div`
	height: 100%;
    width: 100%;
    position: fixed;
    top: 0px;
    left: 0px;
    z-index: 999;
    background-color: ${(props: StyleProps) => props.theme.backgroundColor};
	color: ${(props: StyleProps) => props.theme.color};
	`;

const IFrame = styled.iframe`
	height: 100%;
    width: 100%;
    border: none;
	`;

interface Props {
	themeId: number;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	resource: any;
	pageNo: number;
}

export default function PdfViewer(props: Props) {

	const iframeRef = useRef<HTMLIFrameElement>(null);

	const onClose = useCallback(() => {
		props.dispatch({
			type: 'DIALOG_CLOSE',
			name: 'pdfViewer',
		});
	}, [props.dispatch]);

	const openExternalViewer = useCallback(async () => {
		await CommandService.instance().execute('openItem', `joplin://${props.resource.id}`);
	}, [props.resource.id]);

	const textSelected = useCallback(async (text: string) => {
		if (!text) return;
		const itemType = ContextMenuItemType.Text;
		const menu = await contextMenu({
			itemType,
			resourceId: null,
			filename: null,
			mime: 'text/plain',
			textToCopy: text,
			linkToCopy: null,
			htmlToCopy: '',
			insertContent: () => { console.warn('insertContent() not implemented'); },
			fireEditorEvent: () => { console.warn('fireEditorEvent() not implemented'); },
			htmlToMd: async (_a, b, _c) => b,
			mdToHtml: async (_a, b, _c) => { return { html: b, pluginAssets: [], cssStrings: [] }; },
		} as ContextMenuOptions, props.dispatch);

		menu.popup({ window: bridge().activeWindow() });
	}, [props.dispatch]);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const onMessage_ = useCallback(async (event: any) => {
		if (!event.data || !event.data.name) {
			return;
		}

		if (event.data.name === 'close') {
			onClose();
		} else if (event.data.name === 'externalViewer') {
			await openExternalViewer();
		} else if (event.data.name === 'textSelected') {
			await textSelected(event.data.text);
		} else {
			console.error('Unknown event received', event.data.name);
		}
	}, [openExternalViewer, textSelected, onClose]);

	useEffect(() => {
		const iframe = iframeRef.current;
		iframe.contentWindow.addEventListener('message', onMessage_);
		return () => {
			// iframe.contentWindow is not always defined
			// https://github.com/laurent22/joplin/issues/7528
			if (iframe.contentWindow) iframe.contentWindow.removeEventListener('message', onMessage_);
		};
	}, [onMessage_]);

	const theme = themeStyle(props.themeId);

	return (
		<Window theme={theme}>
			<IFrame src="./vendor/lib/@joplin/pdf-viewer/index.html" x-url={Resource.fullPath(props.resource)}
				x-appearance={theme.appearance} ref={iframeRef}
				x-title={props.resource.title}
				x-anchorpage={props.pageNo}
				x-type="full"></IFrame>
		</Window>
	);
}
