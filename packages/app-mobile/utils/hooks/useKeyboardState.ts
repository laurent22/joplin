import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Keyboard } from 'react-native';

const useKeyboardState = () => {
	const [keyboardVisible, setKeyboardVisible] = useState(false);
	const [hasSoftwareKeyboard, setHasSoftwareKeyboard] = useState(false);
	const [isFloatingKeyboard, setIsFloatingKeyboard] = useState(false);
	const [keyboardHeight, setKeyboardHeight] = useState(0);
	useEffect(() => {
		const showListener = Keyboard.addListener('keyboardDidShow', (evt) => {
			setKeyboardVisible(true);
			setHasSoftwareKeyboard(true);
			setKeyboardHeight(evt.endCoordinates.height);
		});
		const hideListener = Keyboard.addListener('keyboardDidHide', () => {
			setKeyboardVisible(false);
			setKeyboardHeight(0);
		});
		const floatingListener = Keyboard.addListener('keyboardWillChangeFrame', (evt) => {
			const windowWidth = Dimensions.get('window').width;
			// If the keyboard isn't as wide as the window, the floating keyboard is disabled.
			// See https://github.com/facebook/react-native/issues/29473#issuecomment-696658937
			setIsFloatingKeyboard(evt.endCoordinates.width < windowWidth);
			setKeyboardHeight(evt.endCoordinates.height);
		});

		return (() => {
			showListener.remove();
			hideListener.remove();
			floatingListener.remove();
		});
	});

	return useMemo(() => {
		return {
			keyboardVisible,
			hasSoftwareKeyboard,
			isFloatingKeyboard,
			dockedKeyboardHeight: isFloatingKeyboard ? 0 : keyboardHeight,
		};
	}, [keyboardVisible, hasSoftwareKeyboard, isFloatingKeyboard, keyboardHeight]);
};

export default useKeyboardState;
