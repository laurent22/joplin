import * as React from 'react';
import { KeyboardAvoidingViewProps, KeyboardAvoidingView as NativeKeyboardAvoidingView } from 'react-native';
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

	return <NativeKeyboardAvoidingView
		behavior='padding'
		{...forwardedProps}
		enabled={enabled}
	>
		{children}
	</NativeKeyboardAvoidingView>;
};

export default KeyboardAvoidingView;
