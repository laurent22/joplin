import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const useSafeAreaPadding = () => {
	const { width: windowWidth, height: windowHeight } = useWindowDimensions();
	const safeAreaInsets = useSafeAreaInsets();
	const isLandscape = windowWidth > windowHeight;
	return useMemo(() => {
		return isLandscape ? {
			paddingRight: safeAreaInsets.right,
			paddingLeft: safeAreaInsets.left,
			paddingTop: 15,
			paddingBottom: 15,
		} : {
			paddingTop: safeAreaInsets.top,
			paddingBottom: safeAreaInsets.bottom,
			paddingLeft: 0,
			paddingRight: 0,
		};
	}, [isLandscape, safeAreaInsets]);
};

export default useSafeAreaPadding;
