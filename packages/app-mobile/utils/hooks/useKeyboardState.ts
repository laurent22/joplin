import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Keyboard } from 'react-native';

const useKeyboardState = () => {
	const [keyboardVisible, setKeyboardVisible] = useState(false);
	const [hasSoftwareKeyboard, setHasSoftwareKeyboard] = useState(false);
	const [isFloatingKeyboard, setIsFloatingKeyboard] = useState(false);
	const [height, setHeight] = useState<number>(0);
	useEffect(() => {
		const showListener = Keyboard.addListener('keyboardDidShow', (evt) => {
			setKeyboardVisible(true);
			setHasSoftwareKeyboard(true);
			setHeight(evt.endCoordinates.height);
		});
		const hideListener = Keyboard.addListener('keyboardDidHide', () => {
			setKeyboardVisible(false);
			setHeight(0);
		});
		const floatingListener = Keyboard.addListener('keyboardWillChangeFrame', (evt) => {
			const windowWidth = Dimensions.get('window').width;
			// If the keyboard isn't as wide as the window, the floating keyboard is disabled.
			// See https://github.com/facebook/react-native/issues/29473#issuecomment-696658937
			setIsFloatingKeyboard(evt.endCoordinates.width < windowWidth);
		});

		return (() => {
			showListener.remove();
			hideListener.remove();
			floatingListener.remove();
		});
	});

	return useMemo(() => {
		return { keyboardVisible, hasSoftwareKeyboard, isFloatingKeyboard, height };
	}, [keyboardVisible, hasSoftwareKeyboard, isFloatingKeyboard, height]);
};

export default useKeyboardState;
