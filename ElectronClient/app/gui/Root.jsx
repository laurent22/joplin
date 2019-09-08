const React = require('react');
const { render } = require('react-dom');
const { connect, Provider } = require('react-redux');

const { _ } = require('lib/locale.js');
const Setting = require('lib/models/Setting.js');

const { MainScreen } = require('./MainScreen.min.js');
const { OneDriveLoginScreen } = require('./OneDriveLoginScreen.min.js');
const { DropboxLoginScreen } = require('./DropboxLoginScreen.min.js');
const { StatusScreen } = require('./StatusScreen.min.js');
const { ImportScreen } = require('./ImportScreen.min.js');
const { ConfigScreen } = require('./ConfigScreen.min.js');
const { EncryptionConfigScreen } = require('./EncryptionConfigScreen.min.js');
const { ClipperConfigScreen } = require('./ClipperConfigScreen.min.js');
const { Navigator } = require('./Navigator.min.js');
const WelcomeUtils = require('lib/WelcomeUtils');

const { app } = require('../app');

const { bridge } = require('electron').remote.require('./bridge');

async function initialize() {
	this.wcsTimeoutId_ = null;

	bridge()
		.window()
		.on('resize', function() {
			if (this.wcsTimeoutId_) clearTimeout(this.wcsTimeoutId_);

			this.wcsTimeoutId_ = setTimeout(() => {
				store.dispatch({
					type: 'WINDOW_CONTENT_SIZE_SET',
					size: bridge().windowContentSize(),
				});
				this.wcsTimeoutId_ = null;
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

	store.dispatch({
		type: 'SIDEBAR_VISIBILITY_SET',
		visibility: Setting.value('sidebarVisibility'),
	});
}

class RootComponent extends React.Component {
	async componentDidMount() {
		if (this.props.appState == 'starting') {
			this.props.dispatch({
				type: 'APP_STATE_SET',
				state: 'initializing',
			});

			await initialize(this.props.dispatch);

			this.props.dispatch({
				type: 'APP_STATE_SET',
				state: 'ready',
			});
		}

		await WelcomeUtils.install(this.props.dispatch);
	}

	render() {
		const navigatorStyle = {
			width: this.props.size.width,
			height: this.props.size.height,
		};

		const screens = {
			Main: { screen: MainScreen },
			OneDriveLogin: { screen: OneDriveLoginScreen, title: () => _('OneDrive Login') },
			DropboxLogin: { screen: DropboxLoginScreen, title: () => _('Dropbox Login') },
			Import: { screen: ImportScreen, title: () => _('Import') },
			Config: { screen: ConfigScreen, title: () => _('Options') },
			Status: { screen: StatusScreen, title: () => _('Synchronisation Status') },
			EncryptionConfig: { screen: EncryptionConfigScreen, title: () => _('Encryption Options') },
			ClipperConfig: { screen: ClipperConfigScreen, title: () => _('Clipper Options') },
		};

		return <Navigator style={navigatorStyle} screens={screens} />;
	}
}

const mapStateToProps = state => {
	return {
		size: state.windowContentSize,
		appState: state.appState,
	};
};

const Root = connect(mapStateToProps)(RootComponent);

const store = app().store();

render(
	<Provider store={store}>
		<Root />
	</Provider>,
	document.getElementById('react-root')
);
