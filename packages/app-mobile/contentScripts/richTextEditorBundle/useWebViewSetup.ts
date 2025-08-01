import { RefObject, useEffect, useMemo, useRef } from 'react';
import { WebViewControl } from '../../components/ExtendedWebView/types';
import { SetUpResult } from '../types';
import { EditorControl, EditorSettings } from '@joplin/editor/types';
import RNToWebViewMessenger from '../../utils/ipc/RNToWebViewMessenger';
import { EditorProcessApi, EditorProps, MainProcessApi } from './types';
import useRendererSetup from '../rendererBundle/useWebViewSetup';
import { EditorEvent } from '@joplin/editor/events';
import Logger from '@joplin/utils/Logger';
import shim from '@joplin/lib/shim';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { RendererControl, RenderOptions } from '../rendererBundle/types';
import { ResourceInfos } from '@joplin/renderer/types';

const logger = Logger.create('useWebViewSetup');

interface Props {
	initialText: string;
	noteId: string;
	settings: EditorSettings;
	parentElementClassName: string;
	themeId: number;
	pluginStates: PluginStates;
	noteResources: ResourceInfos;
	onAttachFile: (mime: string, base64: string)=> void;

	onPostMessage: (message: string)=> void;
	onEditorEvent: (event: EditorEvent)=> void;
	webviewRef: RefObject<WebViewControl>;
}

type UseMessengerProps = Props & { renderer: SetUpResult<RendererControl> };

const useMessenger = (props: UseMessengerProps) => {
	const onEditorEventRef = useRef(props.onEditorEvent);
	onEditorEventRef.current = props.onEditorEvent;
	const rendererRef = useRef(props.renderer);
	rendererRef.current = props.renderer;
	const onAttachRef = useRef(props.onAttachFile);
	onAttachRef.current = props.onAttachFile;

	const markupRenderingSettings = useRef<RenderOptions>(null);
	markupRenderingSettings.current = {
		themeId: props.themeId,
		highlightedKeywords: [],
		resources: props.noteResources,
		themeOverrides: {},
		noteHash: '',
		initialScroll: 0,
		pluginAssetContainerSelector: null,
	};

	return useMemo(() => {
		const api: MainProcessApi = {
			onEditorEvent: (event: EditorEvent) => {
				onEditorEventRef.current(event);
				return Promise.resolve();
			},
			logMessage: (message: string) => {
				logger.info(message);
				return Promise.resolve();
			},
			onRender: async (markup, options) => {
				const renderResult = await rendererRef.current.api.render(
					markup,
					{
						...markupRenderingSettings.current,
						splitted: options.splitted,
						pluginAssetContainerSelector: options.pluginAssetContainerSelector,
						mapsToLine: options.mapsToLine,
					},
				);
				return renderResult;
			},
			onPasteFile: async (type: string, base64: string) => {
				onAttachRef.current(type, base64);
			},
		};

		const messenger = new RNToWebViewMessenger<MainProcessApi, EditorProcessApi>(
			'rich-text-editor',
			props.webviewRef,
			api,
		);
		return messenger;
	}, [props.webviewRef]);
};

type UseSourceProps = Props & { renderer: SetUpResult<RendererControl> };

const useSource = (props: UseSourceProps) => {
	const propsRef = useRef(props);
	propsRef.current = props;

	const rendererJs = props.renderer.pageSetup.js;
	const rendererCss = props.renderer.pageSetup.css;

	return useMemo(() => {
		const editorOptions: EditorProps = {
			parentElementClassName: propsRef.current.parentElementClassName,
			initialText: propsRef.current.initialText,
			initialNoteId: propsRef.current.noteId,
			settings: propsRef.current.settings,
		};

		return {
			css: `
				${shim.injectedCss('richTextEditorBundle')}
				${rendererCss}

				/* Increase the size of the editor to make it easier to focus the editor. */
				.prosemirror-editor {
					min-height: 75vh;
				}
			`,
			js: `
				${rendererJs}

				if (!window.richTextEditorCreated) {
					window.richTextEditorCreated = true;
					${shim.injectedJs('richTextEditorBundle')}
					richTextEditorBundle.setUpLogger();
					richTextEditorBundle.initialize(${JSON.stringify(editorOptions)}).then(function(editor) {
						/* For testing */
						window.joplinRichTextEditor_ = editor;
					});
				}
			`,
		};
	}, [rendererJs, rendererCss]);
};

const useWebViewSetup = (props: Props): SetUpResult<EditorControl> => {
	const renderer = useRendererSetup({
		webviewRef: props.webviewRef,
		onBodyScroll: null,
		onPostMessage: props.onPostMessage,
		pluginStates: props.pluginStates,
		themeId: props.themeId,
	});
	const messenger = useMessenger({ ...props, renderer });
	const pageSetup = useSource({ ...props, renderer });

	useEffect(() => {
		void messenger.remoteApi.editor.updateSettings(props.settings);
	}, [props.settings, messenger]);

	return useMemo(() => {
		return {
			api: messenger.remoteApi.editor,
			pageSetup: pageSetup,
			webViewEventHandlers: {
				onLoadEnd: () => {
					messenger.onWebViewLoaded();
					renderer.webViewEventHandlers.onLoadEnd();
				},
				onMessage: (event) => {
					messenger.onWebViewMessage(event);
					renderer.webViewEventHandlers.onMessage(event);
				},
			},
		};
	}, [messenger, pageSetup, renderer.webViewEventHandlers]);
};

export default useWebViewSetup;
