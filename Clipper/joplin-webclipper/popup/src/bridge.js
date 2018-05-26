const randomClipperPort = require('./randomClipperPort');

class Bridge {

	init(browser, browserSupportsPromises, dispatch) {
		console.info('Popup: Init bridge');

		this.browser_ = browser;
		this.dispatch_ = dispatch;
		this.browserSupportsPromises_ = browserSupportsPromises;
		this.clipperServerPort_ = null;
		this.clipperServerPortStatus_ = 'searching';

		this.browser_notify = async (command) => {
			console.info('Popup: Got command: ' + command.name);
			
			if (command.warning) {
				console.warn('Popup: Got warning: ' + command.warning);
				this.dispatch({ type: 'WARNING_SET', text: command.warning });
			} else {
				this.dispatch({ type: 'WARNING_SET', text: '' });
			}

			if (command.name === 'clippedContent') {
				const content = {
					title: command.title,
					bodyHtml: command.html,
					baseUrl: command.baseUrl,
					url: command.url,
				};

				this.dispatch({ type: 'CLIPPED_CONTENT_SET', content: content });
			}
		}

		this.browser_.runtime.onMessage.addListener(this.browser_notify);

		console.info('Popup: Env: ', this.env());

		this.findClipperServerPort();
	}

	env() {
		return !('update_url' in this.browser().runtime.getManifest()) ? 'dev' : 'prod';
	}

	browser() {
		return this.browser_;
	}

	dispatch(action) {
		return this.dispatch_(action);
	}

	async findClipperServerPort() {
		let state = null;
		for (let i = 0; i < 10; i++) {
			state = randomClipperPort(state, this.env());

			try {
				console.info('findClipperServerPort: Trying ' + state.port); 
				const response = await fetch('http://127.0.0.1:' + state.port + '/ping');
				const text = await response.text();
				console.info('findClipperServerPort: Got response: ' + text);
				if (text.trim() === 'JoplinClipperServer') {
					this.clipperServerPortStatus_ = 'found';
					this.clipperServerPort_ = state.port;
					return;
				}
			} catch (error) {
				// continue
			}
		}

		this.clipperServerPortStatus_ = 'not_found';

		return null;
	}

	async clipperServerPort() {
		return new Promise((resolve, reject) => {
			const checkStatus = () => {
				if (this.clipperServerPortStatus_ === 'not_found') {
					reject(new Error('Could not find clipper service. Please make sure that Joplin is running and that the clipper server is enabled.'));
					return true;
				} else if (this.clipperServerPortStatus_ === 'found') {
					resolve(this.clipperServerPort_);
					return true;
				}
				return false;
			}

			if (checkStatus()) return;

			this.dispatch({ type: 'CONTENT_UPLOAD', operation: { searchingClipperServer: true } });

			const waitIID = setInterval(() => {
				if (!checkStatus()) return;
				this.dispatch({ type: 'CONTENT_UPLOAD', operation: null });
				clearInterval(waitIID);
			}, 1000);
		});
	}

	async clipperServerBaseUrl() {
		const port = await this.clipperServerPort();
		return 'http://127.0.0.1:' + port;
	}

	async tabsExecuteScript(options) {
		if (this.browserSupportsPromises_) return this.browser().tabs.executeScript(options);

		return new Promise((resolve, reject) => {
			this.browser().tabs.executeScript(options, () => {
				resolve();
			});
		})
	}

	async tabsQuery(options) {
		if (this.browserSupportsPromises_) return this.browser().tabs.query(options);

		return new Promise((resolve, reject) => {
			this.browser().tabs.query(options, (tabs) => {
				resolve(tabs);
			});
		});
	}

	async tabsSendMessage(tabId, command) {
		if (this.browserSupportsPromises_) return this.browser().tabs.sendMessage(tabId, command);
		
		return new Promise((resolve, reject) => {
			this.browser().tabs.sendMessage(tabId, command, (result) => {
				resolve(result);
			});
		});
	}

	async sendCommandToActiveTab(command) {
		const tabs = await this.tabsQuery({ active: true, currentWindow: true });
		if (!tabs.length) {
			console.warn('No valid tab');
			return;
		}

		this.dispatch({ type: 'CONTENT_UPLOAD', operation: null });

		console.info('Sending message ', command);

		await this.tabsSendMessage(tabs[0].id, command);
	}

	async sendContentToJoplin(content) {
		console.info('Popup: Sending to Joplin...');

		try {
			this.dispatch({ type: 'CONTENT_UPLOAD', operation: { uploading: true } });

			if (!content) throw new Error('Cannot send empty content');

			const baseUrl = await this.clipperServerBaseUrl();

			const response = await fetch(baseUrl + "/notes", {
				method: "POST",
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(content)
			})

			if (!response.ok) {
				this.dispatch({ type: 'CONTENT_UPLOAD', operation: { uploading: false, success: false, errorMessage: response.text() } });
			} else {
				this.dispatch({ type: 'CONTENT_UPLOAD', operation: { uploading: false, success: true } });
			}
		} catch (error) {
			this.dispatch({ type: 'CONTENT_UPLOAD', operation: { uploading: false, success: false, errorMessage: error.message } });
		}
	}

}

const bridge_ = new Bridge();

const bridge = function() {
	return bridge_;
}

export { bridge }