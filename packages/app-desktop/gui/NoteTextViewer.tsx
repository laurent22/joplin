import PostMessageService, { MessageResponse, ResponderComponentType } from '@joplin/lib/services/PostMessageService';
import * as React from 'react';
import { reg } from '@joplin/lib/registry';
import bridge from '../services/bridge';
import { focus } from '@joplin/lib/utils/focusHandler';
import { ForwardedRef, forwardRef, RefObject, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { WindowIdContext } from './NewWindowOrIFrame';
import useDocument from './hooks/useDocument';
import { _ } from '@joplin/lib/locale';

interface Props {
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onDomReady: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onIpcMessage: Function;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	viewerStyle: any;
	contentMaxWidth?: number;
	themeId: number;
}


interface SetHtmlOptions {
	pluginAssets: { path: string }[];
}

export interface NoteViewerControl {
	domReady(): boolean;
	setHtml(html: string, options: SetHtmlOptions): void;
	send(channel: string, arg0?: unknown, arg1?: unknown): void;
	focus(): void;
	hasFocus(): boolean;
}

const usePluginMessageResponder = (webviewRef: RefObject<HTMLIFrameElement>) => {
	const windowId = useContext(WindowIdContext);

	useEffect(() => {
		PostMessageService.instance().registerResponder(ResponderComponentType.NoteTextViewer, '', windowId, (message: MessageResponse) => {
			if (!webviewRef?.current?.contentWindow) {
				reg.logger().warn('Cannot respond to message because target is gone', message);
				return;
			}

			webviewRef.current.contentWindow.postMessage({
				target: 'webview',
				name: 'postMessageService.response',
				data: message,
			}, '*');
		});

		return () => {
			PostMessageService.instance().unregisterResponder(ResponderComponentType.NoteTextViewer, '', windowId);
		};
	}, [webviewRef, windowId]);
};

const NoteTextViewer = forwardRef((props: Props, ref: ForwardedRef<NoteViewerControl>) => {
	const [webview, setWebview] = useState<HTMLIFrameElement|null>(null);
	const webviewRef = useRef<HTMLIFrameElement|null>(null);
	webviewRef.current = webview;
	usePluginMessageResponder(webviewRef);

	const domReadyRef = useRef(false);
	type RemovePluginAssetsCallback = ()=> void;
	const removePluginAssetsCallbackRef = useRef<RemovePluginAssetsCallback|null>(null);

	const parentDoc = useDocument(webview);
	const containerWindow = parentDoc?.defaultView;

	useImperativeHandle(ref, () => {
		const result: NoteViewerControl = {
			domReady: () => domReadyRef.current,
			setHtml: (html: string, options: SetHtmlOptions) => {
				const protocolHandler = bridge().electronApp().getCustomProtocolHandler();

				// Grant & remove asset access.
				if (options.pluginAssets) {
					removePluginAssetsCallbackRef.current?.();

					const pluginAssetPaths: string[] = options.pluginAssets.map((asset) => asset.path);
					const assetAccesses = pluginAssetPaths.map(
						path => protocolHandler.allowReadAccessToFile(path),
					);

					removePluginAssetsCallbackRef.current = () => {
						for (const accessControl of assetAccesses) {
							accessControl.remove();
						}

						removePluginAssetsCallbackRef.current = null;
					};
				}

				result.send('setHtml', html, {
					...options,
					mediaAccessKey: protocolHandler.getMediaAccessKey(),
				});
			},
			send: (channel: string, arg0: unknown = null, arg1: unknown = null) => {
				const win = webviewRef.current?.contentWindow;

				// Window may already be closed
				if (!win) return;

				if (channel === 'focus') {
					win.postMessage({ target: 'webview', name: 'focus', data: {} }, '*');
				}

				// External code should use .setHtml (rather than send('setHtml', ...))
				if (channel === 'setHtml') {
					win.postMessage({ target: 'webview', name: 'setHtml', data: { html: arg0, options: arg1 } }, '*');
				}

				if (channel === 'scrollToHash') {
					win.postMessage({ target: 'webview', name: 'scrollToHash', data: { hash: arg0 } }, '*');
				}

				if (channel === 'setPercentScroll') {
					win.postMessage({ target: 'webview', name: 'setPercentScroll', data: { percent: arg0 } }, '*');
				}

				if (channel === 'setMarkers') {
					win.postMessage({ target: 'webview', name: 'setMarkers', data: { keywords: arg0, options: arg1 } }, '*');
				}
			},
			focus: () => {
				if (webviewRef.current) {
					// Calling focus on webviewRef seems to be necessary when NoteTextViewer.focus
					// is called outside of a user event (e.g. in a setTimeout) or during automated
					// tests:
					focus('NoteTextViewer::focus', webviewRef.current);

					// Calling .focus on this.webviewRef.current isn't sufficient.
					// To allow arrow-key scrolling, focus must also be set within the iframe:
					result.send('focus');
				}
			},
			hasFocus: () => {
				return webviewRef.current?.contains(parentDoc.activeElement);
			},
		};
		return result;
	}, [parentDoc]);

	const webview_domReadyRef = useRef<EventListener>();
	webview_domReadyRef.current = (event: Event) => {
		domReadyRef.current = true;
		if (props.onDomReady) props.onDomReady(event);
	};

	const webview_ipcMessageRef = useRef<EventListener>();
	webview_ipcMessageRef.current = (event: Event) => {
		if (props.onIpcMessage) props.onIpcMessage(event);
	};

	const webview_loadRef = useRef<EventListener>();
	webview_loadRef.current = (event: Event) => {
		webview_domReadyRef.current(event);
	};

	type MessageEventListener = (event: MessageEvent)=> void;
	const webview_messageRef = useRef<MessageEventListener>();
	webview_messageRef.current = (event: MessageEvent) => {
		if (event.source !== webviewRef.current?.contentWindow) return;
		if (!event.data || event.data.target !== 'main') return;

		const callName = event.data.name;
		const args = event.data.args;

		if (props.onIpcMessage) {
			props.onIpcMessage({
				channel: callName,
				args: args,
			});
		}
	};

	useEffect(() => {
		const wv = webviewRef.current;
		if (!wv || !containerWindow) return () => {};

		const webviewListeners: Record<string, EventListener> = {
			'dom-ready': (event) => webview_domReadyRef.current(event),
			'ipc-message': (event) => webview_ipcMessageRef.current(event),
			'load': (event) => webview_loadRef.current(event),
		};

		for (const n in webviewListeners) {
			if (!webviewListeners.hasOwnProperty(n)) continue;
			const fn = webviewListeners[n];
			wv.addEventListener(n, fn);
		}

		const messageListener: MessageEventListener = event => webview_messageRef.current(event);
		containerWindow.addEventListener('message', messageListener);

		return () => {
			domReadyRef.current = false;

			const wv = webviewRef.current;
			if (!wv) return;

			for (const n in webviewListeners) {
				if (!webviewListeners.hasOwnProperty(n)) continue;
				const fn = webviewListeners[n];
				wv.removeEventListener(n, fn);
			}

			containerWindow?.removeEventListener('message', messageListener);

			removePluginAssetsCallbackRef.current?.();
		};
	}, [containerWindow]);

	const viewerStyle = useMemo(() => {
		return { border: 'none', ...props.viewerStyle };
	}, [props.viewerStyle]);

	// allow=fullscreen: Required to allow the user to fullscreen videos.
	return (
		<iframe
			className="noteTextViewer"
			ref={setWebview}
			style={viewerStyle}
			allow='clipboard-write=(self) fullscreen=(self) autoplay=(self) local-fonts=(self) encrypted-media=(self)'
			allowFullScreen={true}
			aria-label={_('Note viewer')}
			src={`joplin-content://note-viewer/${__dirname}/note-viewer/index.html`}
		></iframe>
	);
});

export default NoteTextViewer;
