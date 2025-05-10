import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const useButtonSize = () => {
	const { fontScale } = useWindowDimensions();

	return useMemo(() => {
		return {
			// Scaling the button width/height by the device font scale causes the button to scale
			// with the user's device font size.
			buttonSize: 48 * fontScale,
			iconSize: 22 * fontScale,
		};
	}, [fontScale]);
};

export default useButtonSize;
