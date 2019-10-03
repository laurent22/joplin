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
	}

	webview_domReady(event) {
		this.domReady_ = true;
		if (this.props.onDomReady) this.props.onDomReady(event);
	}

	webview_ipcMessage(event) {
		if (this.props.onIpcMessage) this.props.onIpcMessage(event);
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
			};
		}

		for (let n in this.webviewListeners_) {
			if (!this.webviewListeners_.hasOwnProperty(n)) continue;
			const fn = this.webviewListeners_[n];
			wv.addEventListener(n, fn);
		}

		let isAlreadyReady = false;
		try {
			isAlreadyReady = !this.webviewRef_.current.isLoading();
		} catch (error) {
			// Ignore - it means the view has not started loading, and the DOM ready event has not been emitted yet
			// Error is "The WebView must be attached to the DOM and the dom-ready event emitted before this method can be called."
		}

		// Edge-case - the webview was already ready by the time initWebview was
		// called - so manually call the domReady event to notify caller.
		if (isAlreadyReady) {
			this.webview_domReady({});
		}
	}

	destroyWebview() {
		const wv = this.webviewRef_.current;
		if (!wv || !this.initialized_) return;

		for (let n in this.webviewListeners_) {
			if (!this.webviewListeners_.hasOwnProperty(n)) continue;
			const fn = this.webviewListeners_[n];
			wv.removeEventListener(n, fn);
		}

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

	send(channel, arg0 = null, arg1 = null, arg2 = null, arg3 = null) {
		return this.webviewRef_.current.send(channel, arg0, arg1, arg2, arg3);
	}

	printToPDF(options, callback) {
		// In Electron 4x, printToPDF is broken so need to use this hack:
		// https://github.com/electron/electron/issues/16171#issuecomment-451090245

		// return this.webviewRef_.current.printToPDF(options, callback);
		return this.webviewRef_.current.getWebContents().printToPDF(options, callback);
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
		return this.webviewRef_.current.openDevTools();
	}

	closeDevTools() {
		return this.webviewRef_.current.closeDevTools();
	}

	isDevToolsOpened() {
		return this.webviewRef_.current.isDevToolsOpened();
	}

	// ----------------------------------------------------------------
	// Wrap WebView functions (END)
	// ----------------------------------------------------------------

	render() {
		return <webview ref={this.webviewRef_} style={this.props.viewerStyle} preload="gui/note-viewer/preload.js" src="gui/note-viewer/index.html" webpreferences="contextIsolation" />;
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
