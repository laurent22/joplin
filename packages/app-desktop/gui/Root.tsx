import app from '../app';
import MainScreen from './MainScreen/MainScreen';
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

const { render } = require('react-dom');
const { connect, Provider } = require('react-redux');
const Setting = require('@joplin/lib/models/Setting').default;
const shim = require('@joplin/lib/shim').default;
shim.setReact(React);
const { ImportScreen } = require('./ImportScreen.min.js');
const { ResourceScreen } = require('./ResourceScreen.js');
const { Navigator } = require('./Navigator.min.js');
const WelcomeUtils = require('@joplin/lib/WelcomeUtils');
const { ThemeProvider, StyleSheetManager, createGlobalStyle } = require('styled-components');
const bridge = require('electron').remote.require('./bridge').default;

interface Props {
	themeId: number;
	appState: string;
	dispatch: Function;
	size: Size;
	zoomFactor: number;
}

const GlobalStyle = createGlobalStyle`
	* {
		box-sizing: border-box;
	}

	div, span, a {
		/*color: ${(props: any) => props.theme.color};*/
		/*font-size: ${(props: any) => props.theme.fontSize}px;*/
		font-family: ${(props: any) => props.theme.fontFamily};
	}
`;

let wcsTimeoutId_: any = null;

async function initialize() {
	bridge().window().on('resize', function() {
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
		type: 'NOTE_VISIBLE_PANES_SET',
		panes: Setting.value('noteVisiblePanes'),
	});
}

class RootComponent extends React.Component<Props, any> {
	public async componentDidMount() {
		if (this.props.appState == 'starting') {
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

		await WelcomeUtils.install(this.props.dispatch);
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
			Import: { screen: ImportScreen, title: () => _('Import') },
			Config: { screen: ConfigScreen, title: () => _('Options') },
			Resources: { screen: ResourceScreen, title: () => _('Note attachments') },
			Status: { screen: StatusScreen, title: () => _('Synchronisation Status') },
		};

		return (
			<StyleSheetManager disableVendorPrefixes>
				<ThemeProvider theme={theme}>
					<MenuBar/>
					<GlobalStyle/>
					<Navigator style={navigatorStyle} screens={screens} />
				</ThemeProvider>
			</StyleSheetManager>
		);
	}
}

const mapStateToProps = (state: any) => {
	return {
		size: state.windowContentSize,
		zoomFactor: state.settings.windowContentZoomFactor / 100,
		appState: state.appState,
		themeId: state.settings.theme,
	};
};

const Root = connect(mapStateToProps)(RootComponent);

const store = app().store();

render(
	<Provider store={store}>
		<ErrorBoundary>
			<Root />
		</ErrorBoundary>
	</Provider>,
	document.getElementById('react-root')
);
