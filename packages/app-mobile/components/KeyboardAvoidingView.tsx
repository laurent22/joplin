import * as React from 'react';
import { KeyboardAvoidingViewProps, KeyboardAvoidingView as NativeKeyboardAvoidingView, Platform } from 'react-native';
import useKeyboardState from '../utils/hooks/useKeyboardState';

interface Props extends KeyboardAvoidingViewProps {}

const KeyboardAvoidingView: React.FC<Props> = ({ enabled, children, ...forwardedProps }) => {
	const keyboardState = useKeyboardState();

	enabled &&= (
		// When the floating keyboard is enabled, the KeyboardAvoidingView can have a very small
		// height. Don't use the KeyboardAvoidingView when the floating keyboard is enabled.
		// See https://github.com/facebook/react-native/issues/29473
		!keyboardState.isFloatingKeyboard
	);

	// On Android 16+, use 'height' behavior instead of 'padding' to avoid the gap issue
	const behavior = Platform.OS === 'android' && Platform.Version >= 35 ? 'height' : 'padding';

	return <NativeKeyboardAvoidingView
		behavior={behavior}
		{...forwardedProps}
		enabled={enabled}
	>
		{children}
	</NativeKeyboardAvoidingView>;
};

export default KeyboardAvoidingView;
