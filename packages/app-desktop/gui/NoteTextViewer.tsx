import PostMessageService, { MessageResponse, ResponderComponentType } from '@joplin/lib/services/PostMessageService';
import * as React from 'react';
import { reg } from '@joplin/lib/registry';
import bridge from '../services/bridge';
import { focus } from '@joplin/lib/utils/focusHandler';

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

type RemovePluginAssetsCallback = ()=> void;

interface SetHtmlOptions {
	pluginAssets: { path: string }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default class NoteTextViewerComponent extends React.Component<Props, any> {

	private initialized_ = false;
	private domReady_ = false;
	private webviewRef_: React.RefObject<HTMLIFrameElement>;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private webviewListeners_: any = null;
	private removePluginAssetsCallback_: RemovePluginAssetsCallback|null = null;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public constructor(props: any) {
		super(props);

		this.webviewRef_ = React.createRef();

		PostMessageService.instance().registerResponder(ResponderComponentType.NoteTextViewer, '', (message: MessageResponse) => {
			if (!this.webviewRef_?.current?.contentWindow) {
				reg.logger().warn('Cannot respond to message because target is gone', message);
				return;
			}

			this.webviewRef_.current.contentWindow.postMessage({
				target: 'webview',
				name: 'postMessageService.response',
				data: message,
			}, '*');
		});

		this.webview_domReady = this.webview_domReady.bind(this);
		this.webview_ipcMessage = this.webview_ipcMessage.bind(this);
		this.webview_load = this.webview_load.bind(this);
		this.webview_message = this.webview_message.bind(this);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private webview_domReady(event: any) {
		this.domReady_ = true;
		if (this.props.onDomReady) this.props.onDomReady(event);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private webview_ipcMessage(event: any) {
		if (this.props.onIpcMessage) this.props.onIpcMessage(event);
	}

	private webview_load() {
		this.webview_domReady({});
	}

	private webview_message(event: MessageEvent) {
		if (event.source !== this.webviewRef_.current?.contentWindow) return;
		if (!event.data || event.data.target !== 'main') return;

		const callName = event.data.name;
		const args = event.data.args;

		if (this.props.onIpcMessage) {
			this.props.onIpcMessage({
				channel: callName,
				args: args,
			});
		}
	}

	public domReady() {
		return this.domReady_;
	}

	public initWebview() {
		const wv = this.webviewRef_.current;

		if (!this.webviewListeners_) {
			this.webviewListeners_ = {
				'dom-ready': this.webview_domReady.bind(this),
				'ipc-message': this.webview_ipcMessage.bind(this),
				'load': this.webview_load.bind(this),
			};
		}

		for (const n in this.webviewListeners_) {
			if (!this.webviewListeners_.hasOwnProperty(n)) continue;
			const fn = this.webviewListeners_[n];
			wv.addEventListener(n, fn);
		}

		window.addEventListener('message', this.webview_message);
	}

	public destroyWebview() {
		const wv = this.webviewRef_.current;
		if (!wv || !this.initialized_) return;

		for (const n in this.webviewListeners_) {
			if (!this.webviewListeners_.hasOwnProperty(n)) continue;
			const fn = this.webviewListeners_[n];
			wv.removeEventListener(n, fn);
		}

		window.removeEventListener('message', this.webview_message);

		this.initialized_ = false;
		this.domReady_ = false;

		this.removePluginAssetsCallback_?.();
	}

	public focus() {
		if (this.webviewRef_.current) {
			// Calling focus on webviewRef_ seems to be necessary when NoteTextViewer.focus
			// is called outside of a user event (e.g. in a setTimeout) or during automated
			// tests:
			focus('NoteTextViewer::focus', this.webviewRef_.current);

			// Calling .focus on this.webviewRef.current isn't sufficient.
			// To allow arrow-key scrolling, focus must also be set within the iframe:
			this.send('focus');
		}
	}

	public hasFocus() {
		return this.webviewRef_.current?.contains(document.activeElement);
	}

	public tryInit() {
		if (!this.initialized_ && this.webviewRef_.current) {
			this.initWebview();
			this.initialized_ = true;
		}
	}

	public componentDidMount() {
		this.tryInit();
	}

	public componentDidUpdate() {
		this.tryInit();
	}

	public componentWillUnmount() {
		this.destroyWebview();
	}

	// ----------------------------------------------------------------
	// Wrap WebView functions
	// ----------------------------------------------------------------

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public send(channel: string, arg0: any = null, arg1: any = null) {
		const win = this.webviewRef_.current.contentWindow;

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
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public setHtml(html: string, options: SetHtmlOptions) {
		// Grant & remove asset access.
		if (options.pluginAssets) {
			this.removePluginAssetsCallback_?.();

			const protocolHandler = bridge().electronApp().getCustomProtocolHandler();

			const pluginAssetPaths: string[] = options.pluginAssets.map((asset) => asset.path);
			const assetAccesses = pluginAssetPaths.map(
				path => protocolHandler.allowReadAccessToFile(path),
			);

			this.removePluginAssetsCallback_ = () => {
				for (const accessControl of assetAccesses) {
					accessControl.remove();
				}

				this.removePluginAssetsCallback_ = null;
			};
		}

		this.send('setHtml', html, options);
	}

	// ----------------------------------------------------------------
	// Wrap WebView functions (END)
	// ----------------------------------------------------------------

	public render() {
		const viewerStyle = { border: 'none', ...this.props.viewerStyle };

		// allow=fullscreen: Required to allow the user to fullscreen videos.
		return (
			<iframe
				className="noteTextViewer"
				ref={this.webviewRef_}
				style={viewerStyle}
				allow='clipboard-write=(self) fullscreen=(self) autoplay=(self) local-fonts=(self) encrypted-media=(self)'
				allowFullScreen={true}
				src={`joplin-content://note-viewer/${__dirname}/note-viewer/index.html`}
			></iframe>
		);
	}
}
