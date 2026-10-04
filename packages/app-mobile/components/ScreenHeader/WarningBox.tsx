import * as React from 'react';
import { useMemo, useCallback, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Text, Linking, View } from 'react-native';
import { themeStyle } from '../global-style';
import NavService from '@joplin/lib/services/NavService';

interface UrlTarget {
	url: string;

	screen?: undefined;
}

interface ScreenTarget {
	screen: string;
	screenProps?: Record<string, unknown>;

	url?: undefined;
}

export type WarningBoxTarget = UrlTarget|ScreenTarget;

interface Props {
	themeId: number;
	target: WarningBoxTarget;
	message: string;
	testID?: string;
}

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			container: {
				backgroundColor: '#ff9900',
				flexDirection: 'row',
				padding: theme.marginLeft,
			},
			text: {
				flex: 1,
				color: 'black',
			},
		});
	}, [themeId]);
};

const WarningBox: React.FC<Props> = props => {
	const styles = useStyles(props.themeId);

	const propsRef = useRef(props);
	propsRef.current = props;

	const onPress = useCallback(() => {
		const target = propsRef.current.target;
		if (!target) return;

		const isUrlTarget = (target: WarningBoxTarget): target is UrlTarget => !!target.url;
		if (isUrlTarget(target)) {
			void Linking.openURL(target.url);
		} else {
			void NavService.go(target.screen, target.screenProps);
		}
	}, []);

	const hasTarget = !!propsRef.current.target;
	const bannerContent = <Text style={styles.text}>{props.message}</Text>;
	if (hasTarget) {
		return (
			<TouchableOpacity
				style={styles.container}
				onPress={onPress}
				activeOpacity={0.8}
				accessibilityRole={'button'}
				testID={props.testID}
			>
				{bannerContent}
			</TouchableOpacity>
		);
	} else {
		return (
			<View
				style={styles.container}
				testID={props.testID}
			>
				{bannerContent}
			</View>
		);
	}
};

export default WarningBox;
