import shim from '../../shim';
import SyncTargetRegistry from '../../SyncTargetRegistry';
import { reg } from '../../registry';
import { _ } from '../../locale';
import Setting from '../../models/Setting';
import { Dispatch } from 'redux';

interface BaseProps {
	dispatch: Dispatch;
}

interface BaseState {
	loginUrl: string;
	authCode: string;
	checkingAuthToken: boolean;
}

interface BaseComponent {
	props: BaseProps;
	state: BaseState;
	// Use a Pick<...> to match the types provided by React
	setState<K extends keyof BaseState>(state: Pick<BaseState, K>): void;
}

// DropboxApi is still JS-only. Declare just the methods this module touches.
interface DropboxApi {
	loginUrl(): string;
	setAuthToken(token: string): void;
	execAuthToken(authCode: string): Promise<{ access_token: string }>;
}

interface InputChangeEvent {
	target: { value: string };
}

// Desktop's bridge() returns boolean; mobile's shim returns a Promise. Accept either.
type MessageBox = (message: string)=> unknown;

export default class Shared<Host extends BaseComponent> {
	private comp_: Host;
	private dropboxApi_: DropboxApi | null = null;

	public loginUrl_click: ()=> void;
	public authCodeInput_change: (event: InputChangeEvent | string)=> void;
	public submit_click: ()=> Promise<void>;

	public constructor(comp: Host, showInfoMessageBox: MessageBox, showErrorMessageBox: MessageBox) {
		this.comp_ = comp;

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
				void reg.scheduleSync();
			} catch (error) {
				await showErrorMessageBox(_('Could not authorise application:\n\n%s\n\nPlease try again.', (error as Error).message));
			} finally {
				this.comp_.setState({ checkingAuthToken: false });
			}
		};
	}

	public syncTargetId() {
		return SyncTargetRegistry.nameToId('dropbox');
	}

	public async dropboxApi(): Promise<DropboxApi> {
		if (this.dropboxApi_) return this.dropboxApi_;

		const syncTarget = reg.syncTarget(this.syncTargetId());
		this.dropboxApi_ = await syncTarget.api() as DropboxApi;
		return this.dropboxApi_;
	}

	public async refreshUrl() {
		const api = await this.dropboxApi();

		this.comp_.setState({
			loginUrl: api.loginUrl(),
		});
	}
}
