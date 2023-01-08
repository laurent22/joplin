import * as React from 'react';
import { connect } from 'react-redux';
const { NotesScreen } = require('./screens/notes.js');
const { SearchScreen } = require('./screens/search.js');
import { Component } from 'react';
import { KeyboardAvoidingView, Keyboard, Platform, View, KeyboardEvent, Dimensions, EmitterSubscription } from 'react-native';
import { AppState } from '../utils/types';
const { themeStyle } = require('./global-style.js');

interface State {
	autoCompletionBarExtraHeight: number;
	floatingKeyboardEnabled: boolean;
}

interface Props {
	route: any;
	screens: any;
	themeId: number;
}

class AppNavComponent extends Component<Props, State> {
	private previousRouteName_: string|null = null;
	private keyboardDidShowListener: EmitterSubscription|null = null;
	private keyboardDidHideListener: EmitterSubscription|null = null;
	private keyboardWillChangeFrameListener: EmitterSubscription|null = null;

	constructor(props: Props) {
		super(props);

		this.previousRouteName_ = null;
		this.state = {
			autoCompletionBarExtraHeight: 0, // Extra padding for the auto completion bar at the top of the keyboard
			floatingKeyboardEnabled: false,
		};
	}

	UNSAFE_componentWillMount() {
		if (Platform.OS === 'ios') {
			this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow.bind(this));
			this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide.bind(this));
			this.keyboardWillChangeFrameListener = Keyboard.addListener('keyboardWillChangeFrame', this.keyboardWillChangeFrame);
		}
	}

	componentWillUnmount() {
		this.keyboardDidShowListener?.remove();
		this.keyboardDidHideListener?.remove();
		this.keyboardWillChangeFrameListener?.remove();

		this.keyboardDidShowListener = null;
		this.keyboardDidHideListener = null;
		this.keyboardWillChangeFrameListener = null;
	}

	keyboardDidShow() {
		this.setState({ autoCompletionBarExtraHeight: 30 });
	}

	keyboardDidHide() {
		this.setState({ autoCompletionBarExtraHeight: 0 });
	}

	keyboardWillChangeFrame = (evt: KeyboardEvent) => {
		const windowWidth = Dimensions.get('window').width;
		this.setState({
			floatingKeyboardEnabled: evt.endCoordinates.width < windowWidth,
		});
	};

	render() {
		if (!this.props.route) throw new Error('Route must not be null');

		// Note: certain screens are kept into memory, in particular Notes and Search
		// so that the scroll position is not lost when the user navigate away from them.

		const route = this.props.route;
		let Screen = null;
		let notesScreenVisible = false;
		let searchScreenVisible = false;

		if (route.routeName === 'Notes') {
			notesScreenVisible = true;
		} else if (route.routeName === 'Search') {
			searchScreenVisible = true;
		} else {
			Screen = this.props.screens[route.routeName].screen;
		}

		// Keep the search screen loaded if the user is viewing a note from that search screen
		// so that if the back button is pressed, the screen is still loaded. However, unload
		// it if navigating away.
		const searchScreenLoaded = searchScreenVisible || (this.previousRouteName_ === 'Search' && route.routeName === 'Note');

		this.previousRouteName_ = route.routeName;

		const theme = themeStyle(this.props.themeId);

		const style = { flex: 1, backgroundColor: theme.backgroundColor };

		// When the floating keybaord is enabled, the KeyboardAvoidingView can have a very small
		// height. Don't use the KeyboardAvoidingView when the floating keyboard is enabled.
		// See https://github.com/facebook/react-native/issues/29473#issuecomment-696658937
		const keyboardAvoidingViewEnabled = !this.state.floatingKeyboardEnabled;

		return (
			<KeyboardAvoidingView
				enabled={keyboardAvoidingViewEnabled}
				behavior={Platform.OS === 'ios' ? 'padding' : null}
				style={style}
			>
				<NotesScreen visible={notesScreenVisible} navigation={{ state: route }} />
				{searchScreenLoaded && <SearchScreen visible={searchScreenVisible} navigation={{ state: route }} />}
				{!notesScreenVisible && !searchScreenVisible && <Screen navigation={{ state: route }} />}
				<View style={{ height: this.state.autoCompletionBarExtraHeight }} />
			</KeyboardAvoidingView>
		);
	}
}

const AppNav = connect((state: AppState) => {
	return {
		route: state.route,
		themeId: state.settings.theme,
	};
})(AppNavComponent);

module.exports = { AppNav };
