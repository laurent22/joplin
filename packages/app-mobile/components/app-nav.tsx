import * as React from 'react';
import { ComponentType } from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import NotesScreen from './screens/Notes/Notes';
import SearchScreen from './screens/SearchScreen';
import { Platform, View, StyleSheet } from 'react-native';
import { AppState, Route } from '../utils/types';
import { themeStyle } from './global-style';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useKeyboardState from '../utils/hooks/useKeyboardState';
import usePrevious from '@joplin/lib/hooks/usePrevious';
import { Theme } from '@joplin/lib/themes/type';
import { useMemo } from 'react';
import KeyboardAvoidingView from './KeyboardAvoidingView';

interface ScreenDefaultProps {
	navigation?: { state: Route };
	themeId: number;
	dispatch: Dispatch;
}

interface ScreenSpec<Props extends ScreenDefaultProps = ScreenDefaultProps> {
	screen: ComponentType<Props>;
	props: Partial<Props>;
}

export type Screens = Record<string, ScreenSpec>;

interface Props {
	route: Route;
	screens: Screens;
	dispatch: Dispatch;
	themeId: number;
}

const useStyles = (theme: Theme) => {
	return useMemo(() => {
		return StyleSheet.create({
			keyboardAvoidingView: { flex: 1, backgroundColor: theme.backgroundColor },
		});
	}, [theme]);
};


const AppNavComponent: React.FC<Props> = (props) => {
	const keyboardState = useKeyboardState();
	const safeAreaPadding = useSafeAreaInsets();

	if (!props.route) throw new Error('Route must not be null');

	// Note: certain screens are kept into memory, in particular Notes and Search
	// so that the scroll position is not lost when the user navigate away from them.

	const route = props.route;
	let Screen = null;
	let screenProps = {};
	let notesScreenVisible = false;
	let searchScreenVisible = false;

	if (route.routeName === 'Notes') {
		notesScreenVisible = true;
	} else if (route.routeName === 'Search') {
		searchScreenVisible = true;
	} else {
		const screenSpec = props.screens[route.routeName];
		Screen = screenSpec.screen;
		screenProps = screenSpec.props;
	}

	const previousRouteName = usePrevious(route.routeName, '');

	// Keep the search screen loaded if the user is viewing a note from that search screen
	// so that if the back button is pressed, the screen is still loaded. However, unload
	// it if navigating away.
	const searchScreenLoaded = searchScreenVisible || (previousRouteName === 'Search' && route.routeName === 'Note');

	const theme = themeStyle(props.themeId);
	const styles = useStyles(theme);
	// Workaround: On Android 15 and 16, the main app content seems to auto-resize when the keyboard is shown.
	// On earlier Android versions (and in modals), this does not seem to be the case.
	const keyboardAvoidingViewEnabled =
		(Platform.OS === 'android' && Platform.Version < 35)
		|| Platform.OS === 'ios';
	const autocompletionBarPadding = keyboardState.keyboardVisible && keyboardAvoidingViewEnabled ? safeAreaPadding.top : 0;

	return (
		<KeyboardAvoidingView
			style={styles.keyboardAvoidingView}
			enabled={keyboardAvoidingViewEnabled}
		>
			<NotesScreen visible={notesScreenVisible} />
			{searchScreenLoaded && <SearchScreen visible={searchScreenVisible} />}
			{!notesScreenVisible && !searchScreenVisible && Screen && (
				<Screen
					navigation={{ state: route }}
					themeId={props.themeId}
					dispatch={props.dispatch}
					{...screenProps}
				/>
			)}
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

export default AppNav;
