import * as React from 'react';
import { useMemo, useCallback } from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { themeStyle } from '../global-style';
import NavService from '@joplin/lib/services/NavService';

interface Props {
	themeId: number;
	targetScreen: string;
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

	const onPress = useCallback(() => {
		void NavService.go(props.targetScreen);
	}, [props.targetScreen]);

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={onPress}
			activeOpacity={0.8}
			accessibilityRole='button'
			testID={props.testID}
		>
			<Text style={styles.text}>{props.message}</Text>
		</TouchableOpacity>
	);
};

export default WarningBox;
