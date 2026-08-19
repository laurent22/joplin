import * as React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { SafeAreaViewProps } from 'react-native-safe-area-context';
import useSafeAreaPadding from '../utils/hooks/useSafeAreaPadding';
import { useMemo } from 'react';

interface Props extends SafeAreaViewProps {
	titleBarUnderlayColor?: string;
}

const useStyles = (titleBarUnderlayColor: string) => {
	const padding = useSafeAreaPadding();
	return useMemo(() => {
		return StyleSheet.create({
			titleBarUnderlay: {
				height: padding.paddingTop,
				position: 'absolute',
				left: padding.paddingLeft,
				right: padding.paddingRight,
				top: 0,
				backgroundColor: titleBarUnderlayColor,
			},
			safeArea: {
				...padding,
			},
		});
	}, [titleBarUnderlayColor, padding]);
};

const JoplinSafeAreaView: React.FC<Props> = ({ titleBarUnderlayColor, ...forwardedProps }) => {
	const styles = useStyles(titleBarUnderlayColor);

	if (Platform.OS !== 'web') {
		return <>
			{titleBarUnderlayColor ? <View style={styles.titleBarUnderlay}/> : null}
			<View
				{...forwardedProps}
				style={[forwardedProps.style, styles.safeArea]}
			>{forwardedProps.children}</View>
		</>;
	} else {
		return <View {...forwardedProps}>{forwardedProps.children}</View>;
	}
};

export default JoplinSafeAreaView;
