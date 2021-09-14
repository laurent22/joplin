const React = require('react');
const Component = React.Component;
const { connect } = require('react-redux');
const { NotesScreen } = require('lib/components/screens/notes.js');
const { SearchScreen } = require('lib/components/screens/search.js');
const { KeyboardAvoidingView, Keyboard, Platform, View } = require('react-native');
const { themeStyle } = require('lib/components/global-style.js');

class AppNavComponent extends Component {
	constructor() {
		super();
		this.previousRouteName_ = null;
		this.state = {
			autoCompletionBarExtraHeight: 0, // Extra padding for the auto completion bar at the top of the keyboard
		};
	}

	UNSAFE_componentWillMount() {
		if (Platform.OS === 'ios') {
			this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow.bind(this));
			this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide.bind(this));
		}
	}

	componentWillUnmount() {
		if (this.keyboardDidShowListener) this.keyboardDidShowListener.remove();
		if (this.keyboardDidHideListener) this.keyboardDidHideListener.remove();
		this.keyboardDidShowListener = null;
		this.keyboardDidHideListener = null;
	}

	keyboardDidShow() {
		this.setState({ autoCompletionBarExtraHeight: 30 });
	}

	keyboardDidHide() {
		this.setState({ autoCompletionBarExtraHeight: 0 });
	}

	render() {
		if (!this.props.route) throw new Error('Route must not be null');

		// Note: certain screens are kept into memory, in particular Notes and Search
		// so that the scroll position is not lost when the user navigate away from them.

		const route = this.props.route;
		let Screen = null;
		let notesScreenVisible = false;
		let searchScreenVisible = false;

		if (route.routeName == 'Notes') {
			notesScreenVisible = true;
		} else if (route.routeName == 'Search') {
			searchScreenVisible = true;
		} else {
			Screen = this.props.screens[route.routeName].screen;
		}

		// Keep the search screen loaded if the user is viewing a note from that search screen
		// so that if the back button is pressed, the screen is still loaded. However, unload
		// it if navigating away.
		const searchScreenLoaded = searchScreenVisible || (this.previousRouteName_ == 'Search' && route.routeName == 'Note');

		this.previousRouteName_ = route.routeName;

		const theme = themeStyle(this.props.theme);

		const style = { flex: 1, backgroundColor: theme.backgroundColor };

		return (
			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={style}>
				<NotesScreen visible={notesScreenVisible} navigation={{ state: route }} />
				{searchScreenLoaded && <SearchScreen visible={searchScreenVisible} navigation={{ state: route }} />}
				{!notesScreenVisible && !searchScreenVisible && <Screen navigation={{ state: route }} />}
				<View style={{ height: this.state.autoCompletionBarExtraHeight }} />
			</KeyboardAvoidingView>
		);
	}
}

const AppNav = connect(state => {
	return {
		route: state.route,
		theme: state.settings.theme,
	};
})(AppNavComponent);

module.exports = { AppNav };
