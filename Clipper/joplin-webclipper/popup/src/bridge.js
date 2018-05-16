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
				console.info('Popup: Sending to Joplin...');

				try {
					const response = await fetch("http://127.0.0.1:9967/notes", {
						method: "POST",
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/json'
						},

						//make sure to serialize your JSON body
						body: JSON.stringify({
							title: command.title,
							baseUrl: command.baseUrl,
							bodyHtml: command.html,
							url: command.url,
						})
					})

					console.info('GOT RESPNSE', response);
					const json = await response.json();
					console.info(json);
				} catch (error) {
					console.error('Popup: Cannot send to Joplin', error)
				}
			} else if (command.name === 'pageTitle') {

				this.dispatch({ type: 'PAGE_TITLE_SET', text: command.text });

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

		await this.browser().tabs.sendMessage(tabs[0].id, command);
	}

}

const bridge_ = new Bridge();

const bridge = function() {
	return bridge_;
}

export { bridge }