const React = require('react');
const { connect } = require('react-redux');

class NoteTextViewerComponent extends React.Component {
	constructor() {
		super();

		this.initialized_ = false;
		this.domReady_ = false;

		this.webviewRef_ = React.createRef();
		this.webviewListeners_ = null;

		this.webview_domReady = this.webview_domReady.bind(this);
		this.webview_ipcMessage = this.webview_ipcMessage.bind(this);
		this.webview_load = this.webview_load.bind(this);
		this.webview_message = this.webview_message.bind(this);
	}

	webview_domReady(event) {
		this.domReady_ = true;
		if (this.props.onDomReady) this.props.onDomReady(event);
	}

	webview_ipcMessage(event) {
		if (this.props.onIpcMessage) this.props.onIpcMessage(event);
	}

	webview_load() {
		this.webview_domReady();
	}

	webview_message(event) {
		if (!event.data || event.data.target !== 'main') return;

		const callName = event.data.name;
		const args = event.data.args;

		if (this.props.onIpcMessage) this.props.onIpcMessage({
			channel: callName,
			args: args,
		});
	}

	domReady() {
		return this.domReady_;
	}

	initWebview() {
		const wv = this.webviewRef_.current;

		if (!this.webviewListeners_) {
			this.webviewListeners_ = {
				'dom-ready': this.webview_domReady.bind(this),
				'ipc-message': this.webview_ipcMessage.bind(this),
				'load': this.webview_load.bind(this),
			};
		}

		for (let n in this.webviewListeners_) {
			if (!this.webviewListeners_.hasOwnProperty(n)) continue;
			const fn = this.webviewListeners_[n];
			wv.addEventListener(n, fn);
		}

		this.webviewRef_.current.contentWindow.addEventListener('message', this.webview_message);
	}

	destroyWebview() {
		const wv = this.webviewRef_.current;
		if (!wv || !this.initialized_) return;

		for (let n in this.webviewListeners_) {
			if (!this.webviewListeners_.hasOwnProperty(n)) continue;
			const fn = this.webviewListeners_[n];
			wv.removeEventListener(n, fn);
		}

		this.webviewRef_.current.contentWindow.removeEventListener('message', this.webview_message);

		this.initialized_ = false;
		this.domReady_ = false;
	}

	tryInit() {
		if (!this.initialized_ && this.webviewRef_.current) {
			this.initWebview();
			this.initialized_ = true;
		}
	}

	componentDidMount() {
		this.tryInit();
	}

	componentDidUpdate() {
		this.tryInit();
	}

	componentWillUnmount() {
		this.destroyWebview();
	}

	// ----------------------------------------------------------------
	// Wrap WebView functions
	// ----------------------------------------------------------------

	send(channel, arg0 = null, arg1 = null) {
		const win = this.webviewRef_.current.contentWindow;

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

	printToPDF() { // options, callback) {
		// In Electron 4x, printToPDF is broken so need to use this hack:
		// https://github.com/electron/electron/issues/16171#issuecomment-451090245

		// return this.webviewRef_.current.printToPDF(options, callback);
		// return this.webviewRef_.current.getWebContents().printToPDF(options, callback);
	}

	print() {
		// In Electron 4x, print is broken so need to use this hack:
		// https://github.com/electron/electron/issues/16219#issuecomment-451454948
		// Note that this is not a perfect workaround since it means the options are ignored
		// In particular it means that background images and colours won't be printed (printBackground property will be ignored)

		// return this.webviewRef_.current.getWebContents().print({});
		return this.webviewRef_.current.getWebContents().executeJavaScript('window.print()');
	}

	openDevTools() {
		// return this.webviewRef_.current.openDevTools();
	}

	closeDevTools() {
		// return this.webviewRef_.current.closeDevTools();
	}

	isDevToolsOpened() {
		// return this.webviewRef_.current.isDevToolsOpened();
	}

	// ----------------------------------------------------------------
	// Wrap WebView functions (END)
	// ----------------------------------------------------------------

	render() {
		const viewerStyle = Object.assign({}, this.props.viewerStyle, { borderTop: 'none', borderRight: 'none', borderBottom: 'none' });
		return <iframe className="noteTextViewer" ref={this.webviewRef_} style={viewerStyle} src="gui/note-viewer/index.html"></iframe>;
	}
}

const mapStateToProps = state => {
	return {
		theme: state.settings.theme,
	};
};

const NoteTextViewer = connect(
	mapStateToProps,
	null,
	null,
	{ withRef: true }
)(NoteTextViewerComponent);

module.exports = NoteTextViewer;
