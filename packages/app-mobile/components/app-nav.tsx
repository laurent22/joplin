import * as React from 'react';
import { connect } from 'react-redux';
import NotesScreen from './screens/Notes/Notes';
import SearchScreen from './screens/SearchScreen';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { AppState } from '../utils/types';
import { themeStyle } from './global-style';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useKeyboardState from '../utils/hooks/useKeyboardState';
import usePrevious from '@joplin/lib/hooks/usePrevious';

interface Props {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	route: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	screens: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	dispatch: (action: any)=> void;
	themeId: number;
}

const AppNavComponent: React.FC<Props> = (props) => {
	const keyboardState = useKeyboardState();
	const safeAreaPadding = useSafeAreaInsets();

	if (!props.route) throw new Error('Route must not be null');

	// Note: certain screens are kept into memory, in particular Notes and Search
	// so that the scroll position is not lost when the user navigate away from them.

	const route = props.route;
	let Screen = null;
	let notesScreenVisible = false;
	let searchScreenVisible = false;

	if (route.routeName === 'Notes') {
		notesScreenVisible = true;
	} else if (route.routeName === 'Search') {
		searchScreenVisible = true;
	} else {
		Screen = props.screens[route.routeName].screen;
	}

	const previousRouteName = usePrevious(route.routeName, '');

	// Keep the search screen loaded if the user is viewing a note from that search screen
	// so that if the back button is pressed, the screen is still loaded. However, unload
	// it if navigating away.
	const searchScreenLoaded = searchScreenVisible || (previousRouteName === 'Search' && route.routeName === 'Note');

	const theme = themeStyle(props.themeId);

	const style = { flex: 1, backgroundColor: theme.backgroundColor };

	// When the floating keyboard is enabled, the KeyboardAvoidingView can have a very small
	// height. Don't use the KeyboardAvoidingView when the floating keyboard is enabled.
	// See https://github.com/facebook/react-native/issues/29473
	const keyboardAvoidingViewEnabled = !keyboardState.isFloatingKeyboard;
	const autocompletionBarPadding = Platform.OS === 'ios' && keyboardState.keyboardVisible ? safeAreaPadding.top : 0;

	return (
		<KeyboardAvoidingView
			enabled={keyboardAvoidingViewEnabled}
			behavior={Platform.OS === 'ios' ? 'padding' : null}
			style={style}
		>
			<NotesScreen visible={notesScreenVisible} />
			{searchScreenLoaded && <SearchScreen visible={searchScreenVisible} />}
			{!notesScreenVisible && !searchScreenVisible && <Screen navigation={{ state: route }} themeId={props.themeId} dispatch={props.dispatch} />}
			<View style={{ height: autocompletionBarPadding }} />
		</KeyboardAvoidingView>
	);
};

const AppNav = connect((state: AppState) => {
	return {
		route: state.route,
		themeId: state.settings.theme,
	};
})(AppNavComponent);

module.exports = { AppNav };
