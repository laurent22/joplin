const { shim } = require('lib/shim');
const SyncTargetRegistry = require('lib/SyncTargetRegistry');
const { reg } = require('lib/registry.js');
const { _ } = require('lib/locale.js');
const Setting = require('lib/models/Setting');

class Shared {
	constructor(comp, showInfoMessageBox, showErrorMessageBox) {
		this.comp_ = comp;

		this.dropboxApi_ = null;

		this.comp_.state = {
			loginUrl: '',
			authCode: '',
			checkingAuthToken: false,
		};

		this.loginUrl_click = () => {
			if (!this.comp_.state.loginUrl) return;
			shim.openUrl(this.comp_.state.loginUrl);
		};

		this.authCodeInput_change = event => {
			this.comp_.setState({
				authCode: typeof event === 'object' ? event.target.value : event,
			});
		};

		this.submit_click = async () => {
			this.comp_.setState({ checkingAuthToken: true });

			const api = await this.dropboxApi();
			try {
				const response = await api.execAuthToken(this.comp_.state.authCode);

				Setting.setValue(`sync.${this.syncTargetId()}.auth`, response.access_token);
				api.setAuthToken(response.access_token);
				await showInfoMessageBox(_('The application has been authorised!'));
				this.comp_.props.dispatch({ type: 'NAV_BACK' });
				reg.scheduleSync();
			} catch (error) {
				await showErrorMessageBox(_('Could not authorise application:\n\n%s\n\nPlease try again.', error.message));
			} finally {
				this.comp_.setState({ checkingAuthToken: false });
			}
		};
	}

	syncTargetId() {
		return SyncTargetRegistry.nameToId('dropbox');
	}

	async dropboxApi() {
		if (this.dropboxApi_) return this.dropboxApi_;

		const syncTarget = reg.syncTarget(this.syncTargetId());
		this.dropboxApi_ = await syncTarget.api();
		return this.dropboxApi_;
	}

	async refreshUrl() {
		const api = await this.dropboxApi();

		this.comp_.setState({
			loginUrl: api.loginUrl(),
		});
	}
}

module.exports = Shared;
