const { randomClipperPort } = require('./randomClipperPort');

function msleep(ms) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
}

class Bridge {

	constructor() {
		this.nounce_ = Date.now();
		this.token_ = null;
	}

	async init(browser, browserSupportsPromises, store) {
		console.info('Popup: Init bridge');

		this.browser_ = browser;
		this.dispatch_ = store.dispatch;
		this.store_ = store;
		this.browserSupportsPromises_ = browserSupportsPromises;
		this.clipperServerPort_ = null;
		this.clipperServerPortStatus_ = 'searching';

		function convertCommandToContent(command) {
			return {
				title: command.title,
				body_html: command.html,
				base_url: command.base_url,
				source_url: command.url,
				parent_id: command.parent_id,
				tags: command.tags || '',
				image_sizes: command.image_sizes || {},
				anchor_names: command.anchor_names || [],
				source_command: command.source_command,
				convert_to: command.convert_to,
				stylesheets: command.stylesheets,
			};
		}

		this.browser_notify = async (command) => {
			console.info('Popup: Got command:', command);

			if (command.warning) {
				console.warn(`Popup: Got warning: ${command.warning}`);
				this.dispatch({ type: 'WARNING_SET', text: command.warning });
			} else {
				this.dispatch({ type: 'WARNING_SET', text: '' });
			}

			if (command.name === 'clippedContent') {
				const content = convertCommandToContent(command);
				this.dispatch({ type: 'CLIPPED_CONTENT_SET', content: content });
			}

			if (command.name === 'sendContentToJoplin') {
				const content = convertCommandToContent(command);
				this.dispatch({ type: 'CLIPPED_CONTENT_SET', content: content });

				const state = this.store_.getState();
				content.parent_id = state.selectedFolderId;
				if (content.parent_id) {
					this.sendContentToJoplin(content);
				}
			}

			if (command.name === 'isProbablyReaderable') {
				this.dispatch({ type: 'IS_PROBABLY_READERABLE', value: command.value });
			}
		};
		this.browser_.runtime.onMessage.addListener(this.browser_notify);
		const backgroundPage = await this.backgroundPage(this.browser_);

		// Not sure why the getBackgroundPage() sometimes returns null, so
		// in that case default to "prod" environment, which means the live
		// extension won't be affected by this bug.
		this.env_ = backgroundPage ? backgroundPage.joplinEnv() : 'prod';

		console.info('Popup: Env:', this.env());

		this.dispatch({
			type: 'ENV_SET',
			env: this.env(),
		});
	}

	token() {
		return this.token_;
	}

	async onReactAppStarts() {
		await this.findClipperServerPort();

		if (this.clipperServerPortStatus_ !== 'found') {
			console.info('Skipping initialisation because server port was not found');
			return;
		}

		const restoredState = await this.restoreState();

		await this.checkAuth();
		if (!this.token_) return; // Didn't get a token

		const folders = await this.folderTree();
		this.dispatch({ type: 'FOLDERS_SET', folders: folders.items ? folders.items : folders });

		let tags = [];
		for (let page = 1; page < 10000; page++) {
			const result = await this.clipperApiExec('GET', 'tags', { page: page, order_by: 'title', order_dir: 'ASC' });
			const resultTags = result.items ? result.items : result;
			const hasMore = ('has_more' in result) && result.has_more;
			tags = tags.concat(resultTags);
			if (!hasMore) break;
		}

		this.dispatch({ type: 'TAGS_SET', tags: tags });
		if (restoredState.selectedFolderId) this.dispatch({ type: 'SELECTED_FOLDER_SET', id: restoredState.selectedFolderId });
	}

	async checkAuth() {
		this.dispatch({ type: 'AUTH_STATE_SET', value: 'starting' });

		const existingToken = await this.storageGet(['token']);
		this.token_ = existingToken.token;

		const authCheckResponse = await this.clipperApiExec('GET', 'auth/check', { token: this.token_ });

		if (authCheckResponse.valid) {
			console.info('checkAuth: we already have a valid token - exiting');
			this.dispatch({ type: 'AUTH_STATE_SET', value: 'accepted' });
			return;
		}

		this.token_ = null;
		await this.storageSet({ token: this.token_ });

		this.dispatch({ type: 'AUTH_STATE_SET', value: 'waiting' });

		// Note that Firefox and Chrome works differently for this:
		//
		// - In Chrome, the popup stays open, even when the user leaves the
		//   browser to grant permission in the application.
		//
		// - In Firefox, as soon as the browser loses focus, the popup closes.
		//
		//   It means we can't rely on local state to get this working - instead
		//   we request the auth token, and cache it to local storage (along
		//   with a timestamp). Then next time the user opens the popup (after
		//   it was automatically closed by Firefox), that cached auth token is
		//   re-used and the auth process continues.
		//
		// https://github.com/laurent22/joplin/issues/5125#issuecomment-869547421

		const existingAuthInfo = await this.storageGet(['authToken', 'authTokenTimestamp']);

		let authToken = null;
		if (existingAuthInfo.authToken && Date.now() - existingAuthInfo.authTokenTimestamp < 5 * 60 * 1000) {
			console.info('checkAuth: we already have an auth token - reusing it');
			authToken = existingAuthInfo.authToken;
		} else {
			console.info('checkAuth: we do not have an auth token - requesting it...');
			const response = await this.clipperApiExec('POST', 'auth');
			authToken = response.auth_token;

			await this.storageSet({ authToken: authToken, authTokenTimestamp: Date.now() });
		}

		console.info('checkAuth: we do not have a token - requesting one using auth_token: ', authToken);

		try {
			while (true) {
				const response = await this.clipperApiExec('GET', 'auth/check', { auth_token: authToken });

				if (response.status === 'rejected') {
					console.info('checkAuth: Auth request was not accepted', response);
					this.dispatch({ type: 'AUTH_STATE_SET', value: 'rejected' });
					break;
				} else if (response.status === 'accepted') {
					console.info('checkAuth: Auth request was accepted', response);
					this.dispatch({ type: 'AUTH_STATE_SET', value: 'accepted' });
					this.token_ = response.token;
					await this.storageSet({ token: this.token_ });
					break;
				} else if (response.status === 'waiting') {
					await msleep(1000);
				} else {
					throw new Error(`Unknown auth/check status: ${response.status}`);
				}
			}
		} finally {
			await this.storageSet({ authToken: '', authTokenTimestamp: 0 });
		}
	}

	async backgroundPage(browser) {
		const bgp = browser.extension.getBackgroundPage();
		if (bgp) return bgp;

		return new Promise((resolve) => {
			browser.runtime.getBackgroundPage((bgp) => {
				resolve(bgp);
			});
		});
	}

	env() {
		return this.env_;
	}

	browser() {
		return this.browser_;
	}

	dispatch(action) {
		return this.dispatch_(action);
	}

	scheduleStateSave(state) {
		if (this.scheduleStateSaveIID) {
			clearTimeout(this.scheduleStateSaveIID);
			this.scheduleStateSaveIID = null;
		}

		this.scheduleStateSaveIID = setTimeout(() => {
			this.scheduleStateSaveIID = null;

			const toSave = {
				selectedFolderId: state.selectedFolderId,
			};

			console.info('Popup: Saving state', toSave);

			this.storageSet(toSave);
		}, 100);
	}

	async restoreState() {
		const s = await this.storageGet(null);
		console.info('Popup: Restoring saved state:', s);
		return s;
	}

	async findClipperServerPort() {
		this.dispatch({ type: 'CLIPPER_SERVER_SET', foundState: 'searching' });

		let state = null;
		for (let i = 0; i < 10; i++) {
			state = randomClipperPort(state, this.env());

			try {
				console.info(`findClipperServerPort: Trying ${state.port}`);
				const response = await fetch(`http://127.0.0.1:${state.port}/ping`);
				const text = await response.text();
				console.info(`findClipperServerPort: Got response: ${text}`);
				if (text.trim() === 'JoplinClipperServer') {
					this.clipperServerPortStatus_ = 'found';
					this.clipperServerPort_ = state.port;
					this.dispatch({ type: 'CLIPPER_SERVER_SET', foundState: 'found', port: state.port });
					return;
				}
			} catch (error) {
				// continue
			}
		}

		this.clipperServerPortStatus_ = 'not_found';

		this.dispatch({ type: 'CLIPPER_SERVER_SET', foundState: 'not_found' });

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
			};

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
		return `http://127.0.0.1:${port}`;
	}

	async tabsExecuteScript(options) {
		if (this.browserSupportsPromises_) return this.browser().tabs.executeScript(options);

		return new Promise((resolve, reject) => {
			this.browser().tabs.executeScript(options, () => {
				const e = this.browser().runtime.lastError;
				if (e) {
					const msg = [`tabsExecuteScript: Cannot load ${JSON.stringify(options)}`];
					if (e.message) msg.push(e.message);
					reject(new Error(msg.join(': ')));
				}
				resolve();
			});
		});
	}

	async tabsQuery(options) {
		if (this.browserSupportsPromises_) return this.browser().tabs.query(options);

		return new Promise((resolve) => {
			this.browser().tabs.query(options, (tabs) => {
				resolve(tabs);
			});
		});
	}

	async tabsSendMessage(tabId, command) {
		if (this.browserSupportsPromises_) return this.browser().tabs.sendMessage(tabId, command);

		return new Promise((resolve) => {
			this.browser().tabs.sendMessage(tabId, command, (result) => {
				resolve(result);
			});
		});
	}

	async tabsCreate(options) {
		if (this.browserSupportsPromises_) return this.browser().tabs.create(options);

		return new Promise((resolve) => {
			this.browser().tabs.create(options, () => {
				resolve();
			});
		});
	}

	async folderTree() {
		return this.clipperApiExec('GET', 'folders', { as_tree: 1 });
	}

	async storageSet(keys) {
		if (this.browserSupportsPromises_) return this.browser().storage.local.set(keys);

		return new Promise((resolve) => {
			this.browser().storage.local.set(keys, () => {
				resolve();
			});
		});
	}

	async storageGet(keys, defaultValue = null) {
		if (this.browserSupportsPromises_) {
			try {
				const r = await this.browser().storage.local.get(keys);
				return r;
			} catch (error) {
				return defaultValue;
			}
		} else {
			return new Promise((resolve) => {
				this.browser().storage.local.get(keys, (result) => {
					resolve(result);
				});
			});
		}
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

	async clipperApiExec(method, path, query, body) {
		console.info(`Popup: ${method} ${path}`);

		const baseUrl = await this.clipperServerBaseUrl();

		const fetchOptions = {
			method: method,
			headers: {
				'Content-Type': 'application/json',
			},
		};

		if (body) fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);

		query = Object.assign(query || {}, { token: this.token_ });

		let queryString = '';
		if (query) {
			const s = [];
			for (const k in query) {
				if (!query.hasOwnProperty(k)) continue;
				s.push(`${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`);
			}
			queryString = s.join('&');
			if (queryString) queryString = `?${queryString}`;
		}

		const response = await fetch(`${baseUrl}/${path}${queryString}`, fetchOptions);
		if (!response.ok) {
			const msg = await response.text();
			throw new Error(msg);
		}

		const json = await response.json();
		return json;
	}

	async sendContentToJoplin(content) {
		console.info('Popup: Sending to Joplin...');

		try {
			this.dispatch({ type: 'CONTENT_UPLOAD', operation: { uploading: true } });

			if (!content) throw new Error('Cannot send empty content');

			// There is a bug in Chrome that somehow makes the app send the same request twice, which
			// results in Joplin having the same note twice. There's a 2-3 sec delay between
			// each request. The bug only happens the first time the extension popup is open and the
			// Complete button is clicked.
			//
			// It's beyond my understanding how it's happening. I don't know how this sendContentToJoplin function
			// can be called twice. But even if it is, logically, it's impossible that this
			// call below would be done with twice the same nounce. Even if the function sendContentToJoplin
			// is called twice in parallel, the increment is atomic and should result in two nounces
			// being generated. But it's not. Somehow the function below is called twice with the exact same nounce.
			//
			// It's also not something internal to Chrome that repeat the request since the error is caught
			// so it really seems like a double function call.
			//
			// So this is why below, when we get the duplicate nounce error, we just ignore it so as not to display
			// a useless error message. The whole nounce feature is not for security (it's not to prevent replay
			// attacks), but simply to detect these double-requests and ignore them on Joplin side.
			//
			// This nounce feature is optional, it's only active when the nounce query parameter is provided
			// so it shouldn't affect any other call.
			//
			// This is the perfect Heisenbug - it happens always when opening the popup the first time EXCEPT
			// when the debugger is open. Then everything is working fine and the bug NEVER EVER happens,
			// so it's impossible to understand what's going on.
			const response = await this.clipperApiExec('POST', 'notes', { nounce: this.nounce_++ }, content);

			this.dispatch({ type: 'CONTENT_UPLOAD', operation: { uploading: false, success: true } });

			return response;
		} catch (error) {
			if (error.message === '{"error":"Duplicate Nounce"}') {
				this.dispatch({ type: 'CONTENT_UPLOAD', operation: { uploading: false, success: true } });
			} else {
				this.dispatch({ type: 'CONTENT_UPLOAD', operation: { uploading: false, success: false, errorMessage: error.message } });
			}
		}
	}
}

const bridge_ = new Bridge();

const bridge = function() {
	return bridge_;
};

// eslint-disable-next-line import/prefer-default-export
export { bridge };
