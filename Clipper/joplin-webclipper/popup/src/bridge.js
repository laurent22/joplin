class Bridge {

	init(browser, dispatch) {
		console.info('Popup: Init bridge');

		this.browser_ = browser;
		this.dispatch_ = dispatch;

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
	}

	browser() {
		return this.browser_;
	}

	dispatch(action) {
		return this.dispatch_(action);
	}

	async sendCommandToActiveTab(command) {
		const tabs = await this.browser().tabs.query({ active: true, currentWindow: true });
		if (!tabs.length) {
			console.warn('No valid tab');
			return;
		}

		this.dispatch({ type: 'CONTENT_UPLOAD', operation: null });

		await this.browser().tabs.sendMessage(tabs[0].id, command);
	}

	async sendContentToJoplin(content) {
		console.info('Popup: Sending to Joplin...');

		try {
			this.dispatch({ type: 'CONTENT_UPLOAD', operation: { uploading: true } });

			if (!content) throw new Error('Cannot send empty content');

			const response = await fetch("http://127.0.0.1:9967/notes", {
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