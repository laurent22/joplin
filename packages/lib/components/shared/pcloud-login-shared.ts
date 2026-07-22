import shim from '../../shim';
import SyncTargetRegistry from '../../SyncTargetRegistry';
import { reg } from '../../registry';
import { _ } from '../../locale';
import { Dispatch } from 'redux';
import PCloudApi from '../../pcloud-api';

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

interface InputChangeEvent {
	target: { value: string };
}

// Desktop's bridge() returns boolean; mobile's shim returns a Promise. Accept either.
type MessageBox = (message: string)=> unknown;

export default class Shared<Host extends BaseComponent> {
	private comp_: Host;
	private pcloudApi_: PCloudApi | null = null;

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

			try {
				const api = await this.pcloudApi();

				let authCode = this.comp_.state.authCode.trim();

				// The user might have pasted the full pCloud URL rather than
				// just the code, in which case extract the code from it.
				if (authCode.indexOf('http') === 0) {
					const match = authCode.match(/[?&]code=([^&]+)/);
					if (match) authCode = decodeURIComponent(match[1]);
				}

				await api.execTokenRequest(authCode);
				await showInfoMessageBox(_('The application has been authorised!'));
				this.comp_.props.dispatch({ type: 'NAV_BACK' });
				void reg.scheduleSync(0);
			} catch (error) {
				await showErrorMessageBox(_('Could not authorise application:\n\n%s\n\nPlease try again.', (error as Error).message));
			} finally {
				this.comp_.setState({ checkingAuthToken: false });
			}
		};
	}

	public syncTargetId() {
		return SyncTargetRegistry.nameToId('pcloud');
	}

	public async pcloudApi(): Promise<PCloudApi> {
		if (this.pcloudApi_) return this.pcloudApi_;

		const syncTarget = reg.syncTarget(this.syncTargetId());
		this.pcloudApi_ = await syncTarget.api() as PCloudApi;
		return this.pcloudApi_;
	}

	public async refreshUrl() {
		const api = await this.pcloudApi();

		this.comp_.setState({
			loginUrl: api.loginUrl(),
		});
	}
}
