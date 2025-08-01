import shim from '@joplin/lib/shim';
import { EditorProcessApi, EditorProps as EditorOptions, SelectionRange, MainProcessApi } from './types';
import { SetUpResult } from '../types';
import { SearchState } from '@joplin/editor/types';
import { RefObject, useEffect, useMemo, useRef } from 'react';
import { OnMessageEvent, WebViewControl } from '../../components/ExtendedWebView/types';
import { EditorEvent } from '@joplin/editor/events';
import Logger from '@joplin/utils/Logger';
import RNToWebViewMessenger from '../../utils/ipc/RNToWebViewMessenger';

const logger = Logger.create('markdownEditor');

interface Props {
	editorOptions: EditorOptions;
	initialSelection: SelectionRange;
	noteHash: string;
	globalSearch: string;
	onEditorEvent: (event: EditorEvent)=> void;
	onAttachFile: (mime: string, base64: string)=> void;

	webviewRef: RefObject<WebViewControl>;
}

const defaultSearchState: SearchState = {
	useRegex: false,
	caseSensitive: false,

	searchText: '',
	replaceText: '',
	dialogVisible: false,
};

const useWebViewSetup = ({
	editorOptions, initialSelection, noteHash, globalSearch, webviewRef, onEditorEvent, onAttachFile,
}: Props): SetUpResult<EditorProcessApi> => {
	const setInitialSelectionJs = initialSelection ? `
		cm.select(${initialSelection.start}, ${initialSelection.end});
		cm.execCommand('scrollSelectionIntoView');
	` : '';
	const jumpToHashJs = noteHash ? `
		cm.jumpToHash(${JSON.stringify(noteHash)});
	` : '';
	const setInitialSearchJs = globalSearch ? `
		cm.setSearchState(${JSON.stringify({
		...defaultSearchState,
		searchText: globalSearch,
	})})
	` : '';

	const injectedJavaScript = useMemo(() => `
		if (!window.cm) {
			${shim.injectedJs('markdownEditorBundle')};
			markdownEditorBundle.setUpLogger();

			window.cm = markdownEditorBundle.initializeEditor(
				${JSON.stringify(editorOptions)}
			);

			${jumpToHashJs}
			// Set the initial selection after jumping to the header -- the initial selection,
			// if specified, should take precedence.
			${setInitialSelectionJs}
			${setInitialSearchJs}

			window.onresize = () => {
				cm.execCommand('scrollSelectionIntoView');
			};
		}
	`, [jumpToHashJs, setInitialSearchJs, setInitialSelectionJs, editorOptions]);

	// Scroll to the new hash, if it changes.
	const isFirstScrollRef = useRef(true);
	useEffect(() => {
		// The first "jump to header" is handled during editor setup and shouldn't
		// be handled a second time:
		if (isFirstScrollRef.current) {
			isFirstScrollRef.current = false;
			return;
		}
		if (jumpToHashJs && webviewRef.current) {
			webviewRef.current.injectJS(jumpToHashJs);
		}
	}, [jumpToHashJs, webviewRef]);

	const onEditorEventRef = useRef(onEditorEvent);
	onEditorEventRef.current = onEditorEvent;

	const onAttachRef = useRef(onAttachFile);
	onAttachRef.current = onAttachFile;

	const editorMessenger = useMemo(() => {
		const localApi: MainProcessApi = {
			async onEditorEvent(event) {
				onEditorEventRef.current(event);
			},
			async logMessage(message) {
				logger.debug('CodeMirror:', message);
			},
			async onPasteFile(type, data) {
				onAttachRef.current(type, data);
			},
		};
		const messenger = new RNToWebViewMessenger<MainProcessApi, EditorProcessApi>(
			'markdownEditor', webviewRef, localApi,
		);
		return messenger;
	}, [webviewRef]);

	const webViewEventHandlers = useMemo(() => {
		return {
			onLoadEnd: () => {
				editorMessenger.onWebViewLoaded();
			},
			onMessage: (event: OnMessageEvent) => {
				editorMessenger.onWebViewMessage(event);
			},
		};
	}, [editorMessenger]);

	const api = useMemo(() => {
		return editorMessenger.remoteApi;
	}, [editorMessenger]);

	const editorSettings = editorOptions.settings;
	useEffect(() => {
		api.editor.updateSettings(editorSettings);
	}, [api, editorSettings]);

	return useMemo(() => ({
		pageSetup: {
			js: injectedJavaScript,
			css: '',
		},
		api,
		webViewEventHandlers,
	}), [injectedJavaScript, api, webViewEventHandlers]);
};

export default useWebViewSetup;
