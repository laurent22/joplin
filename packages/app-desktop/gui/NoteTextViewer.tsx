import PostMessageService, { MessageResponse, ResponderComponentType } from '@joplin/lib/services/PostMessageService';
import * as React from 'react';
import { reg } from '@joplin/lib/registry';

interface Props {
	onDomReady: Function;
	onIpcMessage: Function;
	viewerStyle: any;
	contentMaxWidth?: number;
	themeId: number;
}

export default class NoteTextViewerComponent extends React.Component<Props, any> {

	private initialized_: boolean = false;
	private domReady_: boolean = false;
	private webviewRef_: any;
	private webviewListeners_: any = null;

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

	private webview_domReady(event: any) {
		this.domReady_ = true;
		if (this.props.onDomReady) this.props.onDomReady(event);
	}

	private webview_ipcMessage(event: any) {
		if (this.props.onIpcMessage) this.props.onIpcMessage(event);
	}

	private webview_load() {
		this.webview_domReady({});
	}

	private webview_message(event: any) {
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

		this.webviewRef_.current.contentWindow.addEventListener('message', this.webview_message);
	}

	public destroyWebview() {
		const wv = this.webviewRef_.current;
		if (!wv || !this.initialized_) return;

		for (const n in this.webviewListeners_) {
			if (!this.webviewListeners_.hasOwnProperty(n)) continue;
			const fn = this.webviewListeners_[n];
			wv.removeEventListener(n, fn);
		}

		try {
			// It seems this can throw a cross-origin error in a way that is hard to replicate so just wrap
			// it in try/catch since it's not critical.
			// https://github.com/laurent22/joplin/issues/3835
			this.webviewRef_.current.contentWindow.removeEventListener('message', this.webview_message);
		} catch (error) {
			reg.logger().warn('Error destroying note viewer', error);
		}

		this.initialized_ = false;
		this.domReady_ = false;
	}

	public focus() {
		if (this.webviewRef_.current) {
			this.webviewRef_.current.focus();
		}
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

	public send(channel: string, arg0: any = null, arg1: any = null) {
		const win = this.webviewRef_.current.contentWindow;

		if (channel === 'focus') {
			win.postMessage({ target: 'webview', name: 'focus', data: {} }, '*');
		}

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

	// ----------------------------------------------------------------
	// Wrap WebView functions (END)
	// ----------------------------------------------------------------

	public render() {
		const viewerStyle = Object.assign({}, { border: 'none' }, this.props.viewerStyle);
		return <iframe className="noteTextViewer" ref={this.webviewRef_} style={viewerStyle} src="gui/note-viewer/index.html"></iframe>;
	}
}
