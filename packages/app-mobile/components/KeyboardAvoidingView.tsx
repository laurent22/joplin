import * as React from 'react';
import { View, ViewProps } from 'react-native';
import useKeyboardState from '../utils/hooks/useKeyboardState';
import { useMemo } from 'react';

interface Props extends ViewProps {
	enabled: boolean;
}

// To work around various issues, don't use React Native's KeyboardAvoidingView here.
// Using a custom KeyboardAvoidingView implementation seems to be more reliable. As of early 2026,
// - On an Android 10 emulator and iOS, React Native's KeyboardAvoiding view needs additional padding
//   to prevent content from being covered by the keyboard. On an Android 16 emulator, it does not.
// - On iPadOS, showing the floating keyboard causes the KeyboardAvoidingView to have a very small height
//   (https://github.com/facebook/react-native/issues/29473).
//
// This view assumes that keyboards, if docked, are docked to the bottom of the screen.
const KeyboardAvoidingView: React.FC<Props> = ({ children, style, enabled, ...forwardedProps }) => {
	const keyboardState = useKeyboardState();

	enabled &&= (
		// When the floating keyboard is enabled, the KeyboardAvoidingView can have a very small
		// height. Don't use the KeyboardAvoidingView when the floating keyboard is enabled.
		// See https://github.com/facebook/react-native/issues/29473
		!keyboardState.isFloatingKeyboard

		// Disable the keyboard avoiding view when the keyboard isn't visible. This may prevent the view's content
		// from shifting if the view is loaded soon after closing the keyboard.
		&& keyboardState.keyboardVisible
	);

	const dockedKeyboardHeight = keyboardState.dockedKeyboardHeight;
	const paddingStyles = useMemo(() => {
		return { paddingBottom: dockedKeyboardHeight };
	}, [dockedKeyboardHeight]);

	return <View
		style={enabled ? [paddingStyles, style] : style}
		{...forwardedProps}
	>
		{children}
	</View>;
};

export default KeyboardAvoidingView;
