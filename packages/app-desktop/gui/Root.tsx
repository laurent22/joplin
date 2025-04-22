import app from '../app';
import { AppState, AppStateDialog } from '../app.reducer';
import MainScreen from './MainScreen';
import ConfigScreen from './ConfigScreen/ConfigScreen';
import StatusScreen from './StatusScreen/StatusScreen';
import OneDriveLoginScreen from './OneDriveLoginScreen';
import DropboxLoginScreen from './DropboxLoginScreen';
import ErrorBoundary from './ErrorBoundary';
import { themeStyle } from '@joplin/lib/theme';
import { Size } from './ResizableLayout/utils/types';
import MenuBar from './MenuBar';
import { _ } from '@joplin/lib/locale';
const React = require('react');
const { createRoot } = require('react-dom/client');
const { connect, Provider } = require('react-redux');
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import ClipperServer from '@joplin/lib/ClipperServer';
import DialogTitle from './DialogTitle';
import DialogButtonRow, { ButtonSpec, ClickEvent, ClickEventHandler } from './DialogButtonRow';
import Dialog from './Dialog';
import StyleSheetContainer from './StyleSheets/StyleSheetContainer';
import ImportScreen from './ImportScreen';
const { ResourceScreen } = require('./ResourceScreen.js');
import Navigator from './Navigator';
import WelcomeUtils from '@joplin/lib/WelcomeUtils';
import JoplinCloudLoginScreen from './JoplinCloudLoginScreen';
import InteropService from '@joplin/lib/services/interop/InteropService';
import WindowCommandsAndDialogs from './WindowCommandsAndDialogs/WindowCommandsAndDialogs';
import { defaultWindowId, stateUtils, WindowState } from '@joplin/lib/reducer';
import bridge from '../services/bridge';
import EditorWindow from './NoteEditor/EditorWindow';
import PopupNotificationProvider from './PopupNotification/PopupNotificationProvider';
const { ThemeProvider, StyleSheetManager, createGlobalStyle } = require('styled-components');

interface Props {
	themeId: number;
	appState: string;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
	size: Size;
	zoomFactor: number;
	needApiAuth: boolean;
	dialogs: AppStateDialog[];
	secondaryWindowStates: WindowState[];
}

interface ModalDialogProps {
	themeId: number;
	message: string;
	buttonSpecs: ButtonSpec[];
	onClick: ClickEventHandler;
}


const GlobalStyle = createGlobalStyle`
	* {
		box-sizing: border-box;
	}
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
let wcsTimeoutId_: any = null;

async function initialize() {
	bridge().activeWindow().on('resize', () => {
		if (wcsTimeoutId_) shim.clearTimeout(wcsTimeoutId_);

		wcsTimeoutId_ = shim.setTimeout(() => {
			store.dispatch({
				type: 'WINDOW_CONTENT_SIZE_SET',
				size: bridge().windowContentSize(),
			});
			wcsTimeoutId_ = null;
		}, 10);
	});

	// Need to dispatch this to make sure the components are
	// displayed at the right size. The windowContentSize is
	// also set in the store default state, but at that point
	// the window might not be at its final size.
	store.dispatch({
		type: 'WINDOW_CONTENT_SIZE_SET',
		size: bridge().windowContentSize(),
	});

	store.dispatch({
		type: 'EDITOR_CODE_VIEW_CHANGE',
		value: Setting.value('editor.codeView'),
	});

	store.dispatch({
		type: 'NOTE_VISIBLE_PANES_SET',
		panes: Setting.value('noteVisiblePanes'),
	});

	InteropService.instance().document = document;
	InteropService.instance().xmlSerializer = new XMLSerializer();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
class RootComponent extends React.Component<Props, any> {
	public async componentDidMount() {
		if (this.props.appState === 'starting') {
			this.props.dispatch({
				type: 'APP_STATE_SET',
				state: 'initializing',
			});

			await initialize();

			this.props.dispatch({
				type: 'APP_STATE_SET',
				state: 'ready',
			});
		}

		await WelcomeUtils.install(Setting.value('locale'), this.props.dispatch);
	}

	private renderModalMessage(props: ModalDialogProps) {
		if (!props) return null;

		const renderContent = () => {
			return (
				<div>
					<DialogTitle title={_('Confirmation')}/>
					<p>{props.message}</p>
					<DialogButtonRow
						themeId={props.themeId}
						onClick={props.onClick}
						okButtonShow={false}
						cancelButtonShow={false}
						customButtons={props.buttonSpecs}
					/>
				</div>
			);
		};

		return <Dialog>{renderContent()}</Dialog>;
	}

	private modalDialogProps(): ModalDialogProps {
		if (!this.props.needApiAuth) return null;

		let message = '';
		const buttonSpecs: ButtonSpec[] = [];
		let onClick: ClickEventHandler = null;

		if (this.props.needApiAuth) {
			message = _('The Web Clipper needs your authorisation to access your data.');
			buttonSpecs.push({ name: 'ok', label: _('Grant authorisation') });
			buttonSpecs.push({ name: 'cancel', label: _('Reject') });
			onClick = (event: ClickEvent) => {
				ClipperServer.instance().api.acceptAuthToken(event.buttonName === 'ok');
			};
		} else {
			return null;
		}

		return {
			themeId: this.props.themeId,
			buttonSpecs,
			message,
			onClick,
		};
	}

	private renderSecondaryWindows() {
		return this.props.secondaryWindowStates.map((windowState: WindowState) => {
			return <EditorWindow
				key={`new-window-note-${windowState.windowId}`}
				windowId={windowState.windowId}
				newWindow={true}
			/>;
		});
	}

	public render() {
		const navigatorStyle = {
			width: this.props.size.width / this.props.zoomFactor,
			height: this.props.size.height / this.props.zoomFactor,
		};

		const theme = themeStyle(this.props.themeId);

		const screens = {
			Main: { screen: MainScreen },
			OneDriveLogin: { screen: OneDriveLoginScreen, title: () => _('OneDrive Login') },
			DropboxLogin: { screen: DropboxLoginScreen, title: () => _('Dropbox Login') },
			JoplinCloudLogin: { screen: JoplinCloudLoginScreen, title: () => _('Joplin Cloud Login') },
			Import: { screen: ImportScreen, title: () => _('Import') },
			Config: { screen: ConfigScreen, title: () => _('Options') },
			Resources: { screen: ResourceScreen, title: () => _('Note attachments') },
			Status: { screen: StatusScreen, title: () => _('Synchronisation Status') },
		};

		return (
			<StyleSheetManager disableVendorPrefixes>
				<ThemeProvider theme={theme}>
					<PopupNotificationProvider>
						<StyleSheetContainer/>
						<MenuBar/>
						<GlobalStyle/>
						<WindowCommandsAndDialogs windowId={defaultWindowId} />
						<Navigator style={navigatorStyle} screens={screens} className={`profile-${this.props.profileConfigCurrentProfileId}`} />
						{this.renderSecondaryWindows()}
						{this.renderModalMessage(this.modalDialogProps())}
					</PopupNotificationProvider>
				</ThemeProvider>
			</StyleSheetManager>
		);
	}
}

const mapStateToProps = (state: AppState) => {
	return {
		size: state.windowContentSize,
		zoomFactor: state.settings.windowContentZoomFactor / 100,
		appState: state.appState,
		themeId: state.settings.theme,
		needApiAuth: state.needApiAuth,
		dialogs: state.dialogs,
		profileConfigCurrentProfileId: state.profileConfig.currentProfileId,
		secondaryWindowStates: stateUtils.secondaryWindowStates(state),
	};
};

const Root = connect(mapStateToProps)(RootComponent);

const store = app().store();

const root = createRoot(document.getElementById('react-root'));
root.render(
	<Provider store={store}>
		<ErrorBoundary>
			<Root />
		</ErrorBoundary>
	</Provider>,
);
