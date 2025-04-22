import * as React from 'react';
import { Text, TouchableRipple } from 'react-native-paper';
import Icon from '../Icon';
import { themeStyle } from '../global-style';
import { connect } from 'react-redux';
import { AppState } from '../../utils/types';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useMemo } from 'react';

interface Props extends ViewProps {
	themeId: number;
	title: string;
	icon: string;
	onPress: ()=> void;
}

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		return StyleSheet.create({
			icon: {
				fontSize: 27,
				width: 44,
				height: 44,
				textAlign: 'center',
				overflow: 'hidden',

				color: theme.color3,
				borderColor: theme.codeBorderColor, // TODO: Use a different theme variable
				borderRadius: 22,
				padding: 6,
				borderWidth: 2,
				backgroundColor: theme.backgroundColor3,
			},
			buttonContent: {
				flexDirection: 'column',
				alignItems: 'center',
				gap: 6,
			},
			button: {
				borderRadius: 8,
				padding: 8,
			},
		});
	}, [themeId]);
};

const LabelledIconButton: React.FC<Props> = ({ title, icon, style, themeId, ...otherProps }) => {
	const styles = useStyles(themeId);
	return <TouchableRipple
		borderless={true}
		role='button'
		accessibilityRole='button'
		{...otherProps}
		style={[styles.button, style]}
	>
		<View style={styles.buttonContent}>
			<Icon style={styles.icon} accessibilityLabel={null} name={icon}/>
			<Text variant='labelMedium'>{title}</Text>
		</View>
	</TouchableRipple>;
};

export default connect((state: AppState) => {
	return { themeId: state.settings.theme };
})(LabelledIconButton);
