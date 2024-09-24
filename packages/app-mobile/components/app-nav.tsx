import * as React from 'react';
import { connect } from 'react-redux';
import NotesScreen from './screens/Notes';
import SearchScreen from './screens/SearchScreen';
import { Component } from 'react';
import { KeyboardAvoidingView, Keyboard, Platform, View, KeyboardEvent, Dimensions, EmitterSubscription } from 'react-native';
import { AppState } from '../utils/types';
import { themeStyle } from './global-style';

interface State {
	autoCompletionBarExtraHeight: number;
	floatingKeyboardEnabled: boolean;
}

interface Props {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	route: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	screens: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	dispatch: (action: any)=> void;
	themeId: number;
}

class AppNavComponent extends Component<Props, State> {
	private previousRouteName_: string|null = null;
	private keyboardDidShowListener: EmitterSubscription|null = null;
	private keyboardDidHideListener: EmitterSubscription|null = null;
	private keyboardWillChangeFrameListener: EmitterSubscription|null = null;

	public constructor(props: Props) {
		super(props);

		this.previousRouteName_ = null;
		this.state = {
			autoCompletionBarExtraHeight: 0, // Extra padding for the auto completion bar at the top of the keyboard
			floatingKeyboardEnabled: false,
		};
	}

	public UNSAFE_componentWillMount() {
		if (Platform.OS === 'ios') {
			this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow.bind(this));
			this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide.bind(this));
			this.keyboardWillChangeFrameListener = Keyboard.addListener('keyboardWillChangeFrame', this.keyboardWillChangeFrame);
		}
	}

	public componentWillUnmount() {
		this.keyboardDidShowListener?.remove();
		this.keyboardDidHideListener?.remove();
		this.keyboardWillChangeFrameListener?.remove();

		this.keyboardDidShowListener = null;
		this.keyboardDidHideListener = null;
		this.keyboardWillChangeFrameListener = null;
	}

	public keyboardDidShow() {
		this.setState({ autoCompletionBarExtraHeight: 30 });
	}

	public keyboardDidHide() {
		this.setState({ autoCompletionBarExtraHeight: 0 });
	}

	private keyboardWillChangeFrame = (evt: KeyboardEvent) => {
		const windowWidth = Dimensions.get('window').width;

		// If the keyboard isn't as wide as the window, the floating keyboard is disabled.
		// See https://github.com/facebook/react-native/issues/29473#issuecomment-696658937
		this.setState({
			floatingKeyboardEnabled: evt.endCoordinates.width < windowWidth,
		});
	};

	public render() {
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

		// When the floating keyboard is enabled, the KeyboardAvoidingView can have a very small
		// height. Don't use the KeyboardAvoidingView when the floating keyboard is enabled.
		// See https://github.com/facebook/react-native/issues/29473
		const keyboardAvoidingViewEnabled = !this.state.floatingKeyboardEnabled;

		return (
			<KeyboardAvoidingView
				enabled={keyboardAvoidingViewEnabled}
				behavior={Platform.OS === 'ios' ? 'padding' : null}
				style={style}
			>
				<NotesScreen visible={notesScreenVisible} />
				{searchScreenLoaded && <SearchScreen visible={searchScreenVisible} />}
				{!notesScreenVisible && !searchScreenVisible && <Screen navigation={{ state: route }} themeId={this.props.themeId} dispatch={this.props.dispatch} />}
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
