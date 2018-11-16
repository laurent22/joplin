const { reg } = require('lib/registry.js');
const { _ } = require('lib/locale.js');
const BaseService = require('lib/services/BaseService');
const url = require('url');
const path = require('path');

class WebClipper extends BaseService {

	constructor() {
		super();
		this.win_ = null;
		this.browserDomReady = false;
		this.loading_ = null;
	}

	webview() {
		if (!this.win_) {
			// lazy load for electron, so that this module can be required by nodejs
			const { BrowserWindow, ipcMain } = require('electron');
			this.win_ = new BrowserWindow({
				width: 1280,
				height: 720,
				show: false,
				offscreen: true,
				nodeIntegration: false,
				webPreferences: {
					preload: 'clipper-preload.js',
				}
			});
			this.win_.loadURL(url.format({
				pathname: path.join(__dirname, 'webclipper.html'),
				protocol: 'file:',
				slashes: true
			}));
			const webContents = this.win_.webContents;
			//webContents.setFrameRate(1);
			//webContents.stopPainting();
			webContents.on('dom-ready', this.browser_domReady.bind(this));
			webContents.on('will-attach-webview', this.browser_willAttachWebview.bind(this));
			webContents.on('did-attach-webview', this.browser_didAttachWebview.bind(this));
			ipcMain.on('clipHtml', this.clipHtml.bind(this));
		}
		return this.win_;
	}

	stop() {
		if (this.win_) {
			//this.win_.close();
			this.win_ = null;
		}
	}

	startWebview_(url) {
		if (this.loading_) {
			this.loading_.url = url;
		} else {
			this.loading_ = {url: url};
		}
		if(this.browserDomReady) {
			const webContents = this.win_.webContents;
			const loadURL = () => {
				webContents.send('webclipper', {
					type: 'loadURL',
					id: this.loading_.id,
					value: url,
				});
			};
			const openDevTools = false;
			if (openDevTools) {
				webContents.openDevTools();
				webContents.on('devtools-opened', loadURL);
			} else {
				loadURL();
			}
		} else {
			this.webview();
		}
	}

	stopWebview_() {
		if (this.win_)
			this.win_.webContents.send('webclipper', {
				type: 'stopWebview',
				id: this.loading_.id,
				value: this.loading_.url,
			});
		this.loading_ = null;
	}

	resolve(note) {
		const resolve = this.loading_ ? this.loading_.resolve : null;
		this.stopWebview_();
		if (resolve) {
			//this.win_.close();
			resolve(note);
		} else {
			this.logger().warn('WebClipping resolve failed for ', note);
		}
	}

	reject(reason) {
		const reject = this.loading_ ? this.loading_.reject : null;
		this.stopWebview_();
		if (reject) {
			this.win_.close();
			reject(reason);
		} else {
			this.logger().warn('WebClipping reject failed for ', reason);
		}
	}

	browser_domReady(event) {
		this.browserDomReady = true;
		this.startWebview_(this.loading_.url);
		const webContents = this.win_.webContents;
		webContents.on('console-message', this.browser_consoleMessage.bind(this));
	}

	browser_willAttachWebview(event, webPreference, params) {
		this.logger().info('browser_willAttachWebview', this.loading_.id, params.src);
	}

	browser_didAttachWebview(event, guestContents) {
		this.logger().info('browser_didAttachWebview', this.loading_.id, this.loading_.url);
		const webContents = this.win_.webContents;
		webContents.send('webclipper', {
			type: 'attachIpcMessage',
			id: this.loading_.id,
			value: this.loading_.url,
		});
		//this.loading_.webContents = guestContents;
		//guestContents.on('dom-ready', this.webview_domReady.bind(this));
		//guestContents.on('ipc-message', this.webview_ipcMessage.bind(this));
		//guestContents.on('message', this.webview_message.bind(this));
		guestContents.on('console-message', this.webview_consoleMessage.bind(this));
	}
	browser_consoleMessage(event, level, message, line, sourceId, args) {
		this.logger().debug("webclipper console.log: " + message);
	}

	clipHtml(event, args) {
		const data = args && args.length ? args[0] : {};
		try {
			if (data.title && data.html) {
				this.resolve(data);
			} else {
				this.reject(Error('Web clipping failed without html'));
			}
		} catch (error) {
			this.reject(error);
		}
	}

	webview_domReady() {
        const webContents = this.loading_.webContents;

		webContents.on('did-navigate', (event) => {
			const url = event.url;
            this.logger().debug("did-navigate' for ", this.loading_.id || 'not_loading_', url);
			//this.props.updateMdClipping(HtmlToMd(htmlBody));
		});
        webContents.on('devtools-opened', (event) => {
            webContents.executeJavaScript('console.debug("executeJavascript ok __dirname=' +
                __dirname + '");');
        });
		//webContents.openDevTools();
	}

	webview_consoleMessage(event, level, message, line, sourceId, args) {
		if (sourceId.startsWith('/') || sourceId === '')
		this.logger().debug("webclipper console.log from ", event.sender.history[0], message);
	}

	webview_message(event, args) {
		this.logger.debug('webview_message');
	}

    webview_ipcMessage(channel, args) {
        const arg0 = args && args.length >= 1 ? args[0] : null;
        const arg1 = args && args.length >= 2 ? args[1] : null;

        //reg.logger().debug('Got ipc-message: ' + msg, args);

        if (channel === 'clipHtml') {
            const newNote = arg0;
			this.resolve(newNote);
        } else if (channel === "log") {
            this.logger().debug(...args);
        } else if (channel.indexOf('#') === 0) {
            // This is an internal anchor, which is handled by the WebView so skip this case
        } else {
            this.logger().error(_('Unsupported link or message: %s', channel));
        }
    }

	clipSimplifiedPage(id, url) {
		if (this.loading_) {
			return new Promise((resolve, reject) => {
				reject(new Error("WebClipper loading another url: "
					+ this.loading_.url + ' for ' + this.loading_.id));
			});
		}
		this.loading_ = { id: id, url: url, };

		this.startWebview_(url);
		return new Promise((resolve, reject) => {
			this.loading_.resolve = resolve;
			this.loading_.reject = reject;
		});
	}
}

module.exports = WebClipper;
