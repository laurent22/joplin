const React = require('react'); const Component = React.Component;
const { connect } = require('react-redux');
const { NotesScreen } = require('lib/components/screens/notes.js');
const { SearchScreen } = require('lib/components/screens/search.js');
const { View } = require('react-native');
const { _ } = require('lib/locale.js');
const { themeStyle } = require('lib/components/global-style.js');

class AppNavComponent extends Component {

	constructor() {
		super();
		this.previousRouteName_ = null;
	}

	render() {
		if (!this.props.route) throw new Error('Route must not be null');

		// Note: certain screens are kept into memory, in particular Notes and Search
		// so that the scroll position is not lost when the user navigate away from them.

		let route = this.props.route;
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
		let searchScreenLoaded = searchScreenVisible || (this.previousRouteName_ == 'Search' && route.routeName == 'Note');

		this.previousRouteName_ = route.routeName;

		const theme = themeStyle(this.props.theme);

		const style = { flex: 1, backgroundColor: theme.backgroundColor }

		return (
			<View style={style}>
				<NotesScreen visible={notesScreenVisible} navigation={{ state: route }} />
				{ searchScreenLoaded && <SearchScreen visible={searchScreenVisible} navigation={{ state: route }} /> }
				{ (!notesScreenVisible && !searchScreenVisible) && <Screen navigation={{ state: route }} /> }
			</View>
		);
	}

}

const AppNav = connect(
	(state) => {
		return {
			route: state.route,
			theme: state.settings.theme,
		};
	}
)(AppNavComponent)

module.exports = { AppNav };