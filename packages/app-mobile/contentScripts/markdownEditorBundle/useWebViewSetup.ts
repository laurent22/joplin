import shim from '@joplin/lib/shim';
import { EditorProcessApi, EditorProps as EditorOptions, SelectionRange, MainProcessApi } from './types';
import { SetUpResult } from '../types';
import { SearchState } from '@joplin/editor/types';
import { RefObject, useEffect, useMemo, useRef } from 'react';
import { OnMessageEvent, WebViewControl } from '../../components/ExtendedWebView/types';
import { EditorEvent } from '@joplin/editor/events';
import Logger from '@joplin/utils/Logger';
import RNToWebViewMessenger from '../../utils/ipc/RNToWebViewMessenger';
import { _ } from '@joplin/lib/locale';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import useCodeMirrorPlugins from './utils/useCodeMirrorPlugins';
import Resource from '@joplin/lib/models/Resource';
import { parseResourceUrl } from '@joplin/lib/urlUtils';
const { isImageMimeType } = require('@joplin/lib/resourceUtils');

const logger = Logger.create('markdownEditor');

interface Props {
	editorOptions: EditorOptions;
	initialSelection: SelectionRange|null;
	noteHash: string;
	globalSearch: string;
	pluginStates: PluginStates;
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

type Result = SetUpResult<EditorProcessApi> & { hasPlugins: boolean };

const useWebViewSetup = ({
	editorOptions, pluginStates, initialSelection, noteHash, globalSearch, webviewRef, onEditorEvent, onAttachFile,
}: Props): Result => {
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

	const afterLoadFinishedJs = useRef((): string => '');
	// Store as a callback to avoid rebuilding the string on each content change.
	// Since the editor content is included in editorOptions, for large documents,
	// creating the initial injected JS is potentially expensive.
	afterLoadFinishedJs.current = () => `
		if (!window.cm) {
			const parentClassName = ${JSON.stringify(editorOptions?.parentElementOrClassName)};
			const foundParent = !!parentClassName && document.getElementsByClassName(parentClassName).length > 0;

			// On Android, injectedJavaScript can be run multiple times, including once before the
			// document has loaded. To avoid logging an error each time the editor starts, don't throw
			// if the parent element can't be found:
			if (foundParent) {
				window.cm = markdownEditorBundle.createMainEditor(${JSON.stringify(editorOptions)});

				${jumpToHashJs}

				// Set the initial selection after jumping to the header -- the initial selection,
				// if specified, should take precedence.
				${setInitialSelectionJs}
				${setInitialSearchJs}

				window.onresize = () => {
					cm.execCommand('scrollSelectionIntoView');
				};
			} else if (parentClassName) {
				console.log('No parent element found with class name ', parentClassName);
			}
		}
	`;

	const injectedJavaScript = useMemo(() => `
		if (typeof window.markdownEditorBundle === 'undefined') {
			${shim.injectedJs('markdownEditorBundle')};
			window.markdownEditorBundle = markdownEditorBundle;
			markdownEditorBundle.setUpLogger();
		}
	`, []);

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

	const codeMirrorPlugins = useCodeMirrorPlugins(pluginStates);
	const codeMirrorPluginsRef = useRef(codeMirrorPlugins);
	codeMirrorPluginsRef.current = codeMirrorPlugins;

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
			async onLocalize(text) {
				const localizationFunction = _;
				return localizationFunction(text);
			},
			async onEditorAdded() {
				messenger.remoteApi.updatePlugins(codeMirrorPluginsRef.current);
			},
			async onResolveImageSrc(src, reloadCounter) {
				const url = parseResourceUrl(src);
				if (!url.itemId) return null;
				const item = await Resource.load(url.itemId);

				if (shim.mobilePlatform() === 'web') {
					// Maximum 6 MiB on web
					const maximumSize = 6 * 1024 * 1024;
					if (isImageMimeType(item.mime) && item.size < maximumSize) {
						const data = await shim.fsDriver().readFile(Resource.fullPath(item), 'base64');
						return `data:${item.mime};base64,${data}`;
					}
					return null;
				} else {
					const path = Resource.fullPath(item);
					return reloadCounter ? `${path}?r=${reloadCounter}` : path;
				}
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
				webviewRef.current?.injectJS(afterLoadFinishedJs.current());
				editorMessenger.onWebViewLoaded();
			},
			onMessage: (event: OnMessageEvent) => {
				editorMessenger.onWebViewMessage(event);
			},
		};
	}, [editorMessenger, webviewRef]);

	const api = useMemo(() => {
		return editorMessenger.remoteApi;
	}, [editorMessenger]);

	const editorSettings = editorOptions.settings;
	useEffect(() => {
		api.updateSettings(editorSettings);
	}, [api, editorSettings]);

	useEffect(() => {
		api.updatePlugins(codeMirrorPlugins);
	}, [codeMirrorPlugins, api]);

	return useMemo(() => ({
		pageSetup: {
			js: injectedJavaScript,
			css: '',
		},
		hasPlugins: codeMirrorPlugins.length > 0,
		api,
		webViewEventHandlers,
	}), [injectedJavaScript, api, webViewEventHandlers, codeMirrorPlugins]);
};

export default useWebViewSetup;
