import { useEffect, useMemo, useState } from 'react';
import { Keyboard } from 'react-native';

const useKeyboardVisible = () => {
	const [keyboardVisible, setKeyboardVisible] = useState(false);
	const [hasSoftwareKeyboard, setHasSoftwareKeyboard] = useState(false);
	useEffect(() => {
		const showListener = Keyboard.addListener('keyboardDidShow', () => {
			setKeyboardVisible(true);
			setHasSoftwareKeyboard(true);
		});
		const hideListener = Keyboard.addListener('keyboardDidHide', () => {
			setKeyboardVisible(false);
		});

		return (() => {
			showListener.remove();
			hideListener.remove();
		});
	});

	return useMemo(() => {
		return { keyboardVisible, hasSoftwareKeyboard };
	}, [keyboardVisible, hasSoftwareKeyboard]);
};

export default useKeyboardVisible;
